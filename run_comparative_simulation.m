clear; clc; close all;

% sim config
Ts = 1e-4;
T_end = 0.8;
t = (0:Ts:T_end)';
N = length(t);

V_ref = 300.0 * ones(N, 1);

% load plant params
if exist('DC_Bus_Plant_Params.mat', 'file')
    load('DC_Bus_Plant_Params.mat', 'tau_plant', 'K_plant', 'Kp_est', 'Ki_est');
else
    tau_plant = 0.015;
    K_plant = 1.2;
    Kp_est = 1.0;
    Ki_est = 30.0;
end

% load disturbance profile
d_load = zeros(N, 1);
for k = 1:N
    tk = t(k);
    if tk >= 0.15 && tk < 0.35
        d_load(k) = 25.0;  % load step
    elseif tk >= 0.35 && tk < 0.55
        d_load(k) = -20.0; % load drop
    elseif tk >= 0.55 && tk < 0.70
        d_load(k) = 12.0 * sin(2 * pi * 25 * tk); % ac ripple
    end
end

V_pi  = 300.0 * ones(N, 1);
V_flc = 300.0 * ones(N, 1);
V_ann = 300.0 * ones(N, 1);

u_pi_sim  = zeros(N, 1);
u_flc_sim = zeros(N, 1);
u_ann_sim = zeros(N, 1);

% 1. PI loop
int_e_pi = 0;
for k = 1:N-1
    e = V_ref(k) - V_pi(k);
    int_e_pi = int_e_pi + e * Ts;
    u = Kp_est * e + Ki_est * int_e_pi;
    u = max(-50.0, min(50.0, u));
    u_pi_sim(k) = u;
    
    dV = ( -(V_pi(k) - 300.0)/tau_plant + K_plant * u - d_load(k) ) * Ts;
    V_pi(k+1) = V_pi(k) + dV;
end
u_pi_sim(N) = u_pi_sim(N-1);

% 2. FLC loop
prev_e_flc = 0;
u_flc_acc  = 0;
for k = 1:N-1
    e = V_ref(k) - V_flc(k);
    de = (e - prev_e_flc) / Ts;
    prev_e_flc = e;
    
    delta_u = evaluate_flc(e, de, 0.1, 0.005, 2.0);
    u_flc_acc = u_flc_acc + delta_u * Ts * 120.0 + 1.2 * e;
    u_flc_acc = max(-50.0, min(50.0, u_flc_acc));
    u_flc_sim(k) = u_flc_acc;
    
    dV = ( -(V_flc(k) - 300.0)/tau_plant + K_plant * u_flc_acc - d_load(k) ) * Ts;
    V_flc(k+1) = V_flc(k) + dV;
end
u_flc_sim(N) = u_flc_sim(N-1);

% 3. ANN loop
prev_e_ann = 0;
u_ann_acc  = 0;
for k = 1:N-1
    e = V_ref(k) - V_ann(k);
    de = (e - prev_e_ann) / Ts;
    prev_e_ann = e;
    
    [~, du_neural] = evaluate_ann_controller(e, de, []);
    u_ann_acc = u_ann_acc + du_neural * Ts * 140.0 + 1.5 * e;
    u_ann_acc = max(-50.0, min(50.0, u_ann_acc));
    u_ann_sim(k) = u_ann_acc;
    
    dV = ( -(V_ann(k) - 300.0)/tau_plant + K_plant * u_ann_acc - d_load(k) ) * Ts;
    V_ann(k+1) = V_ann(k) + dV;
end
u_ann_sim(N) = u_ann_sim(N-1);

% err metrics
err_pi  = V_ref - V_pi;
err_flc = V_ref - V_flc;
err_ann = V_ref - V_ann;

rmse_pi_val  = sqrt(mean(err_pi.^2));
rmse_flc_val = sqrt(mean(err_flc.^2));
rmse_ann_val = sqrt(mean(err_ann.^2));

mae_pi_val  = mean(abs(err_pi));
mae_flc_val = mean(abs(err_flc));
mae_ann_val = mean(abs(err_ann));

peak_pi_val  = max(abs(err_pi));
peak_flc_val = max(abs(err_flc));
peak_ann_val = max(abs(err_ann));

iae_pi_val  = sum(abs(err_pi)) * Ts;
iae_flc_val = sum(abs(err_flc)) * Ts;
iae_ann_val = sum(abs(err_ann)) * Ts;

itae_pi_val  = sum(t .* abs(err_pi)) * Ts;
itae_flc_val = sum(t .* abs(err_flc)) * Ts;
itae_ann_val = sum(t .* abs(err_ann)) * Ts;

pct_rmse_flc = (1 - rmse_flc_val / rmse_pi_val) * 100;
pct_rmse_ann = (1 - rmse_ann_val / rmse_pi_val) * 100;
pct_peak_flc = (1 - peak_flc_val / peak_pi_val) * 100;
pct_peak_ann = (1 - peak_ann_val / peak_pi_val) * 100;

% print results
disp('========================================================================');
disp('                    PI vs FLC vs ANN Summary Table                      ');
disp('========================================================================');
fprintf('Peak err:  PI=%.2f V | FLC=%.2f V (%.1f%% drop) | ANN=%.2f V (%.1f%% drop)\n', ...
    peak_pi_val, peak_flc_val, pct_peak_flc, peak_ann_val, pct_peak_ann);
fprintf('RMSE:      PI=%.2f V | FLC=%.2f V (%.1f%% drop) | ANN=%.2f V (%.1f%% drop)\n', ...
    rmse_pi_val, rmse_flc_val, pct_rmse_flc, rmse_ann_val, pct_rmse_ann);
fprintf('IAE:       PI=%.4f   | FLC=%.4f (%.1f%% drop)   | ANN=%.4f (%.1f%% drop)\n', ...
    iae_pi_val, iae_flc_val, (1-iae_flc_val/iae_pi_val)*100, iae_ann_val, (1-iae_ann_val/iae_pi_val)*100);
fprintf('ITAE:      PI=%.4f   | FLC=%.4f (%.1f%% drop)   | ANN=%.4f (%.1f%% drop)\n', ...
    itae_pi_val, itae_flc_val, (1-itae_flc_val/itae_pi_val)*100, itae_ann_val, (1-itae_ann_val/itae_pi_val)*100);
disp('========================================================================');

% plots
fig = figure(4);
subplot(4, 1, 1);
plot(t, V_ref, 'k--', t, V_pi, 'r', t, V_flc, 'b', t, V_ann, 'm');
ylabel('Vdc (V)');
legend('Vref', 'PI', 'FLC', 'ANN', 'Location', 'southeast');
grid on; ylim([270, 330]);

subplot(4, 1, 2);
plot(t, d_load, 'k');
ylabel('Dist (V)');
grid on;

subplot(4, 1, 3);
plot(t, err_pi, 'r', t, err_flc, 'b', t, err_ann, 'm');
ylabel('Verr (V)');
legend('PI', 'FLC', 'ANN');
grid on;

subplot(4, 1, 4);
plot(t, u_pi_sim, 'r', t, u_flc_sim, 'b', t, u_ann_sim, 'm');
ylabel('u(t)'); xlabel('t (s)');
legend('PI', 'FLC', 'ANN');
grid on;

saveas(fig, 'DC_Bus_AI_Control_Comparison.png');

% zoom plot
fig2 = figure(5);
idx_z = (t >= 0.14 & t <= 0.25);

subplot(2, 1, 1);
plot(t(idx_z), V_ref(idx_z), 'k--', t(idx_z), V_pi(idx_z), 'r', ...
     t(idx_z), V_flc(idx_z), 'b', t(idx_z), V_ann(idx_z), 'm');
ylabel('Vdc (V)');
legend('Vref', 'PI', 'FLC', 'ANN');
grid on;

subplot(2, 1, 2);
plot(t(idx_z), err_pi(idx_z), 'r', t(idx_z), err_flc(idx_z), 'b', t(idx_z), err_ann(idx_z), 'm');
ylabel('Verr (V)'); xlabel('t (s)');
legend('PI err', 'FLC err', 'ANN err');
grid on;

saveas(fig2, 'DC_Bus_Transient_Zoom.png');
