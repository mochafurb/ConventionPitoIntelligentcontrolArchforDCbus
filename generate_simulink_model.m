clear; clc;

model_name = 'DC_Bus_AI_Control_Model';

if ~license('test', 'Simulink') || isempty(which('new_system'))
    disp('Simulink not available, use script sim instead.');
    return;
end

if bdIsLoaded(model_name)
    close_system(model_name, 0);
end

new_system(model_name);
open_system(model_name);

% add blocks
add_block('simulink/Sources/Constant', [model_name '/Vdc_Ref'], ...
    'Value', '300', 'Position', [50, 100, 90, 130]);

add_block('simulink/Math Operations/Sum', [model_name '/Sum_Error'], ...
    'Inputs', '+-', 'Position', [140, 105, 160, 135]);

add_block('simulink/Continuous/PID Controller', [model_name '/PI_Controller'], ...
    'Controller', 'PI', 'P', '1.0', 'I', '2.0', 'Position', [220, 70, 270, 110]);

add_block('simulink/User-Defined Functions/MATLAB Function', [model_name '/FLC_Controller'], ...
    'Position', [220, 140, 290, 180]);

add_block('simulink/Signal Routing/Manual Switch', [model_name '/Controller_Switch'], ...
    'Position', [340, 105, 370, 145]);

add_block('simulink/Sources/Step', [model_name '/Load_Disturbance'], ...
    'Time', '0.2', 'Before', '0', 'After', '25', 'Position', [340, 210, 380, 240]);

add_block('simulink/Math Operations/Sum', [model_name '/Sum_Plant_Input'], ...
    'Inputs', '+-', 'Position', [420, 120, 440, 150]);

add_block('simulink/Continuous/Transfer Fcn', [model_name '/DC_Bus_Plant'], ...
    'Numerator', '[1]', 'Denominator', '[0.005 1]', 'Position', [480, 115, 550, 155]);

add_block('simulink/Math Operations/Bias', [model_name '/Nominal_Bias'], ...
    'Bias', '300', 'Position', [580, 120, 620, 150]);

add_block('simulink/Sinks/Scope', [model_name '/DC_Bus_Voltage_Scope'], ...
    'NumInputPorts', '2', 'Position', [680, 95, 720, 145]);

add_block('simulink/Sinks/Scope', [model_name '/Voltage_Error_Scope'], ...
    'Position', [220, 20, 260, 50]);

% wire blocks
add_line(model_name, 'Vdc_Ref/1', 'Sum_Error/1');
add_line(model_name, 'Sum_Error/1', 'PI_Controller/1');
add_line(model_name, 'Sum_Error/1', 'FLC_Controller/1');
add_line(model_name, 'Sum_Error/1', 'Voltage_Error_Scope/1');

add_line(model_name, 'PI_Controller/1', 'Controller_Switch/1');
add_line(model_name, 'FLC_Controller/1', 'Controller_Switch/2');

add_line(model_name, 'Controller_Switch/1', 'Sum_Plant_Input/1');
add_line(model_name, 'Load_Disturbance/1', 'Sum_Plant_Input/2');

add_line(model_name, 'Sum_Plant_Input/1', 'DC_Bus_Plant/1');
add_line(model_name, 'DC_Bus_Plant/1', 'Nominal_Bias/1');

add_line(model_name, 'Nominal_Bias/1', 'Sum_Error/2', 'autorouting', 'on');
add_line(model_name, 'Nominal_Bias/1', 'DC_Bus_Voltage_Scope/1');
add_line(model_name, 'Vdc_Ref/1', 'DC_Bus_Voltage_Scope/2', 'autorouting', 'on');

save_system(model_name);
disp('model created.');
