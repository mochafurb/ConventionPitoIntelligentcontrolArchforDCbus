clear; clc; close all;

% 1. run analysis on excel sheet
disp('step 1: data analysis & sys id');
Case_Study_DCbusData_Analysis;

% 2. build flc
disp('step 2: fuzzy controller');
create_fuzzy_controller;

% 3. train ann
disp('step 3: ann training');
create_neural_controller;

% 4. run comparative sim
disp('step 4: comparative sim');
run_comparative_simulation;

disp('done.');
