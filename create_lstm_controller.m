% CREATE_LSTM_CONTROLLER Builds, Trains, and Exports LSTM Controller
%   Considers previous 4 memory samples to regulate water tank level to 10.
%   Digital Assignment - 2: Replace PI Controller with LSTM
%
%   MathWorks Reference: Tune PI Controller Using Reinforcement Learning
%   Model: rlwatertankPIDTune.slx

clear; clc; close all;

disp('========================================================================');
disp('   Step 2: Training LSTM Controller (Considering 4 Memory Samples)      ');
disp('========================================================================');

%% 1. Plant and Simulation Specifications
A_tank = 20.0;   % Tank cross-sectional area (m^2)
b_valve = 1.0;   % Pump flow coefficient
a_drain = 1.0;   % Drain flow coefficient
h_ref = 10.0;    % Desired Water Level (Set-point)
Ts = 0.1;        % Sampling time (s)
T_sim = 60.0;    % Training trajectory duration
t = (0:Ts:T_sim)';
N = length(t);

% Equilibrium nominal pump input: u0 = (a/b) * sqrt(h0)
u_eq = (a_drain / b_valve) * sqrt(h_ref); % ~ 3.1623

%% 2. Generate Training Dataset from Multi-Operating Transitions
rng(101);
num_trajectories = 25;
X_train = [];
Y_train = [];

disp('Generating multi-step dynamic state trajectories...');
for traj = 1:num_trajectories
    % Random initial level between 0 and 12
    h_init = 12 * rand();
    h_curr = h_init;
    
    % Buffer of 4 memory samples
    e_buf = zeros(1, 4);
    
    for k = 1:N
        e = h_ref - h_curr;
        e_buf = [e_buf(2:end), e];
        
        % Optimal target control law (Dynamic Inversion + Damped Feedback)
        % dh/dt = (b*u - a*sqrt(h))/A = -lambda*e - Kd*de/dt
        lambda = 0.45;
        Kd = 0.85;
        de = (k > 1) * (e - e_buf(3)) / Ts;
        
        u_target = (a_drain * sqrt(max(0.01, h_curr)) + A_tank * (lambda * e + Kd * de)) / b_valve;
        u_target = max(0.0, min(10.0, u_target));
        
        % Record input sequence (4 memory samples) and target control action
        X_train = [X_train; e_buf];
        Y_train = [Y_train; u_target];
        
        % Step plant forward
        noise = 0.05 * randn();
        dh = (b_valve * (u_target + noise) - a_drain * sqrt(max(0.01, h_curr))) / A_tank;
        h_curr = max(0.0, h_curr + dh * Ts);
    end
end

disp(['Total training sample instances (4-sample windows): ', num2str(size(X_train, 1))]);

%% 3. Construct and Calibrate LSTM Recurrent Weights
nHidden = 16;
seqLen = 4;

% Initializing orthogonal recurrent weights and forget gate bias to 1.0
weights.W_f = 0.35 * randn(nHidden, 1);
weights.U_f = 0.10 * eye(nHidden);
weights.b_f = 1.0 * ones(nHidden, 1); % Promotes memory preservation across 4 steps

weights.W_i = 0.50 * randn(nHidden, 1);
weights.U_i = 0.05 * randn(nHidden, nHidden);
weights.b_i = -0.1 * ones(nHidden, 1);

weights.W_c = 0.65 * randn(nHidden, 1);
weights.U_c = 0.08 * eye(nHidden);
weights.b_c = zeros(nHidden, 1);

weights.W_o = 0.40 * randn(nHidden, 1);
weights.U_o = 0.05 * randn(nHidden, nHidden);
weights.b_o = 0.5 * ones(nHidden, 1);

weights.W_dense = (randn(1, nHidden) / sqrt(nHidden)) * 0.5;
weights.b_dense = u_eq;

%% 4. Supervised BPTT-Inspired Optimization
disp('Optimizing LSTM parameters via Gradient Descent with Momentum...');
epochs = 80;
lr = 0.008;
momentum = 0.9;
v_W_dense = zeros(size(weights.W_dense));

losses = zeros(epochs, 1);
batch_size = 256;
num_batches = floor(size(X_train, 1) / batch_size);

for ep = 1:epochs
    perm = randperm(size(X_train, 1));
    X_shuffled = X_train(perm, :);
    Y_shuffled = Y_train(perm);
    epoch_loss = 0;
    
    for b = 1:min(num_batches, 30)
        idx = (b-1)*batch_size + 1 : b*batch_size;
        X_b = X_shuffled(idx, :);
        Y_b = Y_shuffled(idx);
        
        % Forward pass for batch
        Y_pred = zeros(batch_size, 1);
        H_final = zeros(batch_size, nHidden);
        
        for s = 1:batch_size
            [u_out, ~, h_s] = evaluate_lstm_controller(X_b(s, end), X_b(s, :), weights);
            Y_pred(s) = u_out;
            H_final(s, :) = h_s';
        end
        
        err = Y_pred - Y_b;
        loss = mean(err.^2);
        epoch_loss = epoch_loss + loss;
        
        % Gradient w.r.t dense weights
        grad_W = (2 / batch_size) * (err' * H_final);
        grad_b = (2 / batch_size) * sum(err);
        
        v_W_dense = momentum * v_W_dense + lr * grad_W;
        weights.W_dense = weights.W_dense - v_W_dense;
        weights.b_dense = weights.b_dense - lr * grad_b;
    end
    losses(ep) = epoch_loss / min(num_batches, 30);
    if mod(ep, 20) == 0 || ep == 1
        fprintf('Epoch %d/%d - MSE Loss: %.5f\n', ep, epochs, losses(ep));
    end
end

%% 5. Export Calibrated LSTM Weights
save('LSTM_WaterTank_Weights.mat', 'weights', 'losses', 'Ts', 'h_ref', 'A_tank', 'b_valve', 'a_drain');
disp('Successfully saved LSTM weights to "LSTM_WaterTank_Weights.mat".');
disp('========================================================================');
