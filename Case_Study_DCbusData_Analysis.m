clear; clc; close all;

% load excel data
data_file = 'Case Study DCbusData.csv.xlsx';
if ~exist(data_file, 'file')
    error('File not found');
end

opts = detectImportOptions(data_file);
opts.VariableNamingRule = 'preserve';
raw_data = readtable(data_file, opts);

V_ref   = table2array(raw_data(:, 1));
V_sense = table2array(raw_data(:, 2));
V_err   = table2array(raw_data(:, 3));
u_pi    = table2array(raw_data(:, 4));

N = length(V_ref);
Ts = 1e-4; % dt = 0.1ms
t = (0:N-1)' * Ts;

% calc error stats
V_actual = V_ref - V_err;

mse_pi  = mean(V_err.^2);
rmse_pi = sqrt(mse_pi);
mae_pi  = mean(abs(V_err));
max_pos_err = max(V_err);
max_neg_err = min(V_err);
max_abs_err = max(abs(V_err));

iae_pi  = sum(abs(V_err)) * Ts;
itae_pi = sum(t .* abs(V_err)) * Ts;

disp('--- PI baseline stats from data ---');
fprintf('MAE: %.4f V\n', mae_pi);
fprintf('RMSE: %.4f V\n', rmse_pi);
fprintf('Peak err: %.4f V\n', max_abs_err);
fprintf('IAE: %.4f\n', iae_pi);
fprintf('ITAE: %.4f\n', itae_pi);

% plant params: tau = RC ~ 15ms, K_conv = 1.2
tau_plant = 0.015;
K_plant   = 1.2;
num_plant = K_plant;
den_plant = [tau_plant, 1];

Kp_est = 1.0;
Ki_est = 30.0;

save('DC_Bus_Plant_Params.mat', 'Ts', 'Kp_est', 'Ki_est', ...
     'tau_plant', 'K_plant', 'num_plant', 'den_plant', 'mae_pi', 'rmse_pi', ...
     'max_abs_err', 'iae_pi', 'itae_pi');

% plot baseline
figure(1);
subplot(3, 1, 1);
plot(t(1:min(10000, N)), V_ref(1:min(10000, N)), 'r--'); hold on;
plot(t(1:min(10000, N)), V_actual(1:min(10000, N)), 'b');
ylabel('Vdc (V)');
legend('Vref', 'Vsensed');
grid on;

subplot(3, 1, 2);
plot(t(1:min(10000, N)), V_err(1:min(10000, N)), 'k');
ylabel('Verr (V)');
grid on;

subplot(3, 1, 3);
plot(t(1:min(10000, N)), u_pi(1:min(10000, N)), 'g');
ylabel('u(t)');
xlabel('t (s)');
grid on;
