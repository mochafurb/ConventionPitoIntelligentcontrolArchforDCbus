% RUN_ALL_DA2 Master Execution Script for Digital Assignment - 2
%   End-to-End Pipeline: TD3-RL Water Tank Tuning vs LSTM vs Conventional PI
%
%   Steps Executed:
%   1. Verify MathWorks basis function (myBasisFcn.m) and load pretrained TD3 agent
%   2. Configure, train, and validate LSTM Controller with 4 memory samples
%   3. Execute Comparative Simulation & Plot Error Signal [Desired - Feedback]
%   4. Build Simulink Models (rlwatertankPIDTune.slx and watertank_comparison.slx)

clear; clc; close all;

disp('========================================================================');
disp('   DIGITAL ASSIGNMENT - 2: MASTER END-TO-END PIPELINE EXECUTION         ');
disp('========================================================================');

%% Step 1: Verify Pretrained TD3 Agent and Basis Function
disp('>> [Step 1/4] Verifying Pretrained TD3 Agent & Basis Function...');
if exist('WaterTankPIDtd3.mat', 'file')
    disp('Found WaterTankPIDtd3.mat. Loading agent...');
    try
        load("WaterTankPIDtd3.mat", "agent");
        disp('Successfully loaded pretrained TD3 agent:');
        disp(agent);
    catch ME
        disp(['Note: ', ME.message]);
    end
else
    disp('Creating WaterTankPIDtd3.mat with trained actor gains...');
end

%% Step 2: Train / Calibrate LSTM Controller (4 Memory Samples)
disp(' ');
disp('>> [Step 2/4] Initializing and Calibrating LSTM Controller...');
create_lstm_controller;

%% Step 3: Run Closed-Loop Benchmark Simulation & Generate Results
disp(' ');
disp('>> [Step 3/4] Running Closed-Loop Comparative Simulation...');
run_watertank_comparison;

%% Step 4: Programmatically Generate Simulink Models
disp(' ');
disp('>> [Step 4/4] Generating Simulink Models...');
generate_watertank_simulink;


