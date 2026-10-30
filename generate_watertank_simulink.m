% GENERATE_WATERTANK_SIMULINK Programmatically Builds Simulink Models
%   1. rlwatertankPIDTune.slx (Official MathWorks RL Tuning Architecture)
%   2. watertank_comparison.slx (3-way Comparison: PI vs TD3 vs LSTM)
%
%   Digital Assignment - 2: Water Tank Level Control
%   References: MathWorks RL Toolbox & Deep Learning Toolbox

clear; clc;



%% Model 1: rlwatertankPIDTune.slx
mdl1 = 'rlwatertankPIDTune';
if bdIsLoaded(mdl1)
    close_system(mdl1, 0);
end
new_system(mdl1);
open_system(mdl1);

% Add Blocks exactly as shown in MathWorks Example Diagram
add_block('simulink/Sources/Constant', [mdl1 '/Desired Water Level'], ...
    'Value', '10', 'Position', [40, 100, 80, 130]);

add_block('simulink/Math Operations/Sum', [mdl1 '/Sum_Error'], ...
    'Inputs', '+-', 'Position', [130, 105, 150, 135]);

add_block('simulink/Discrete/Discrete PID Controller', [mdl1 '/PID Controller'], ...
    'Position', [210, 95, 270, 145], 'P', '8.452', 'I', '1.825', 'SampleTime', '0.1');

add_block('simulink/Sources/Band-Limited White Noise', [mdl1 '/noise'], ...
    'Cov', '0.01', 'Ts', '0.1', 'Position', [220, 170, 260, 200]);

add_block('simulink/Math Operations/Sum', [mdl1 '/Sum_Noise'], ...
    'Inputs', '++', 'Position', [320, 110, 340, 140]);

% Water Tank Subsystem / Transfer Function
add_block('simulink/Continuous/Transfer Fcn', [mdl1 '/Water-Tank System'], ...
    'Numerator', '[0.05]', 'Denominator', '[1 0.05]', 'Position', [380, 105, 470, 145]);

add_block('simulink/Sinks/To Workspace', [mdl1 '/simout'], ...
    'VariableName', 'simout', 'SaveFormat', 'Array', 'Position', [540, 105, 590, 135]);

% Calculate Cost Subsystem
add_block('simulink/User-Defined Functions/MATLAB Function', [mdl1 '/calculate cost'], ...
    'Position', [320, 230, 400, 270]);

add_block('simulink/Sinks/To Workspace', [mdl1 '/cost'], ...
    'VariableName', 'cost', 'SaveFormat', 'Array', 'Position', [450, 235, 500, 265]);

% Highlighted Area Signal Scope: [Desired water level - feedback]
add_block('simulink/Sinks/Scope', [mdl1 '/Error Output Signal Scope'], ...
    'Position', [210, 30, 250, 60]);

% Wire Model 1
add_line(mdl1, 'Desired Water Level/1', 'Sum_Error/1');
add_line(mdl1, 'Sum_Error/1', 'PID Controller/1');
add_line(mdl1, 'Sum_Error/1', 'Error Output Signal Scope/1');
add_line(mdl1, 'Sum_Error/1', 'calculate cost/1');

add_line(mdl1, 'PID Controller/1', 'Sum_Noise/1');
add_line(mdl1, 'noise/1', 'Sum_Noise/2');
add_line(mdl1, 'PID Controller/1', 'calculate cost/2');

add_line(mdl1, 'Sum_Noise/1', 'Water-Tank System/1');
add_line(mdl1, 'Water-Tank System/1', 'simout/1');
add_line(mdl1, 'Water-Tank System/1', 'Sum_Error/2', 'autorouting', 'on');

add_line(mdl1, 'calculate cost/1', 'cost/1');

save_system(mdl1);
close_system(mdl1);
disp('Successfully generated "rlwatertankPIDTune.slx".');

%% Model 2: watertank_comparison.slx (PI vs TD3-RL vs LSTM)
mdl2 = 'watertank_comparison';
if bdIsLoaded(mdl2)
    close_system(mdl2, 0);
end
new_system(mdl2);
open_system(mdl2);

add_block('simulink/Sources/Constant', [mdl2 '/Desired Water Level'], ...
    'Value', '10', 'Position', [40, 120, 80, 150]);

add_block('simulink/Math Operations/Sum', [mdl2 '/Sum_Error'], ...
    'Inputs', '+-', 'Position', [130, 125, 150, 155]);

% 3 Parallel Controller Branches
add_block('simulink/Discrete/Discrete PID Controller', [mdl2 '/PI_Conventional'], ...
    'Position', [220, 60, 280, 100], 'P', '2.0', 'I', '0.05', 'SampleTime', '0.1');

add_block('simulink/Discrete/Discrete PID Controller', [mdl2 '/PI_TD3_RL'], ...
    'Position', [220, 120, 280, 160], 'P', '8.452', 'I', '1.825', 'SampleTime', '0.1');

add_block('simulink/User-Defined Functions/MATLAB Function', [mdl2 '/LSTM_4_Memory_Samples'], ...
    'Position', [220, 180, 300, 220]);

% Switch to select controller
add_block('simulink/Signal Routing/Multiport Switch', [mdl2 '/Controller_Selector'], ...
    'Inputs', '3', 'Position', [350, 110, 380, 170]);

add_block('simulink/Sources/Constant', [mdl2 '/Select_Mode'], ...
    'Value', '3', 'Position', [300, 70, 330, 90]); % 1=PI, 2=TD3, 3=LSTM

add_block('simulink/Continuous/Transfer Fcn', [mdl2 '/Water-Tank System'], ...
    'Numerator', '[0.05]', 'Denominator', '[1 0.05]', 'Position', [430, 125, 520, 165]);

add_block('simulink/Sinks/Scope', [mdl2 '/Water_Level_Scope'], ...
    'Position', [570, 125, 610, 165]);

add_block('simulink/Sinks/Scope', [mdl2 '/Error_Signal_Scope'], ...
    'Position', [220, 10, 260, 40]);

% Connections
add_line(mdl2, 'Desired Water Level/1', 'Sum_Error/1');
add_line(mdl2, 'Sum_Error/1', 'Error_Signal_Scope/1');
add_line(mdl2, 'Sum_Error/1', 'PI_Conventional/1');
add_line(mdl2, 'Sum_Error/1', 'PI_TD3_RL/1');
add_line(mdl2, 'Sum_Error/1', 'LSTM_4_Memory_Samples/1');

add_line(mdl2, 'Select_Mode/1', 'Controller_Selector/1');
add_line(mdl2, 'PI_Conventional/1', 'Controller_Selector/2');
add_line(mdl2, 'PI_TD3_RL/1', 'Controller_Selector/3');
add_line(mdl2, 'LSTM_4_Memory_Samples/1', 'Controller_Selector/4');

add_line(mdl2, 'Controller_Selector/1', 'Water-Tank System/1');
add_line(mdl2, 'Water-Tank System/1', 'Water_Level_Scope/1');
add_line(mdl2, 'Water-Tank System/1', 'Sum_Error/2', 'autorouting', 'on');

save_system(mdl2);
close_system(mdl2);
disp('Successfully generated "watertank_comparison.slx".');
disp('========================================================================');
