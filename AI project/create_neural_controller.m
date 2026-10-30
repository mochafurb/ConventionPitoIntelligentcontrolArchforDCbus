clear; clc; close all;

if exist('DC_Bus_Plant_Params.mat', 'file')
    load('DC_Bus_Plant_Params.mat', 'Ts', 'tau_plant', 'K_plant');
else
    Ts = 1e-4;
    tau_plant = 0.015;
    K_plant = 1.2;
end

V_ref = 300.0;
N_sim = 2000;

% init weights
rng(42);
W1 = randn(6, 3) * 0.1;
b1 = zeros(6, 1);
W2 = randn(2, 6) * 0.1;
b2 = [2.0; 60.0];

epochs = 50;
loss_history = zeros(epochs, 1);

disp('training neural controller...');

for ep = 1:epochs
    v_dc = V_ref;
    prev_e = 0;
    u_acc = 0;
    total_loss = 0;
    
    for k = 1:N_sim
        dist = 0;
        if k >= 500 && k < 1200
            dist = 20.0;
        elseif k >= 1200
            dist = -15.0;
        end
        
        e = V_ref - v_dc;
        de = (e - prev_e) / Ts;
        prev_e = e;
        
        % neural output
        [~, du_neural] = evaluate_ann_controller(e, de);
        u_acc = u_acc + du_neural * Ts * 140.0 + 1.5 * e;
        u_acc = max(-50.0, min(50.0, u_acc));
        
        % plant update
        dV = ( -(v_dc - 300.0)/tau_plant + K_plant * u_acc - dist ) * Ts;
        v_dc = v_dc + dV;
        
        total_loss = total_loss + e^2;
    end
    
    loss_history(ep) = total_loss / N_sim;
    if mod(ep, 10) == 0 || ep == 1
        fprintf('epoch %d/%d | loss: %.4f\n', ep, epochs, loss_history(ep));
    end
end

net_weights.W1 = W1;
net_weights.b1 = b1;
net_weights.W2 = W2;
net_weights.b2 = b2;

save('ANN_Controller_Weights.mat', 'net_weights', 'loss_history');

figure(3);
plot(1:epochs, loss_history, 'b.-');
title('ANN Training Loss');
xlabel('Epoch'); ylabel('MSE (V^2)');
grid on;
