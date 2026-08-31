clear; clc; close all;

fis_name = 'DC_Bus_FLC';
has_flt = license('test', 'Fuzzy_Toolbox') && ~isempty(which('mamfis'));
fis_created = false;

% try fuzzy toolbox if present
if has_flt
    try
        fis = mamfis('Name', fis_name);
        
        % inputs: e and de
        fis = addInput(fis, [-30, 30], 'Name', 'Error');
        fis = addMF(fis, 'Error', 'trapmf', [-35, -30, -15, -5], 'Name', 'NB');
        fis = addMF(fis, 'Error', 'trimf',  [-15, -7.5, 0],       'Name', 'NS');
        fis = addMF(fis, 'Error', 'trimf',  [-5, 0, 5],           'Name', 'ZE');
        fis = addMF(fis, 'Error', 'trimf',  [0, 7.5, 15],         'Name', 'PS');
        fis = addMF(fis, 'Error', 'trapmf', [5, 15, 30, 35],      'Name', 'PB');
        
        fis = addInput(fis, [-200, 200], 'Name', 'dError');
        fis = addMF(fis, 'dError', 'trapmf', [-250, -200, -100, -20], 'Name', 'NB');
        fis = addMF(fis, 'dError', 'trimf',  [-100, -50, 0],          'Name', 'NS');
        fis = addMF(fis, 'dError', 'trimf',  [-30, 0, 30],            'Name', 'ZE');
        fis = addMF(fis, 'dError', 'trimf',  [0, 50, 100],            'Name', 'PS');
        fis = addMF(fis, 'dError', 'trapmf', [20, 100, 200, 250],     'Name', 'PB');
        
        % out: du
        fis = addOutput(fis, [-10, 10], 'Name', 'delta_u');
        fis = addMF(fis, 'delta_u', 'trapmf', [-12, -10, -6, -2], 'Name', 'NB');
        fis = addMF(fis, 'delta_u', 'trimf',  [-6, -3, 0],         'Name', 'NS');
        fis = addMF(fis, 'delta_u', 'trimf',  [-2, 0, 2],          'Name', 'ZE');
        fis = addMF(fis, 'delta_u', 'trimf',  [0, 3, 6],           'Name', 'PS');
        fis = addMF(fis, 'delta_u', 'trapmf', [2, 6, 10, 12],      'Name', 'PB');
        
        % rules
        rules = [
            1 1 1 1 1; 1 2 1 1 1; 1 3 1 1 1; 1 4 2 1 1; 1 5 3 1 1;
            2 1 1 1 1; 2 2 2 1 1; 2 3 2 1 1; 2 4 3 1 1; 2 5 4 1 1;
            3 1 1 1 1; 3 2 2 1 1; 3 3 3 1 1; 3 4 4 1 1; 3 5 5 1 1;
            4 1 2 1 1; 4 2 3 1 1; 4 3 4 1 1; 4 4 4 1 1; 4 5 5 1 1;
            5 1 3 1 1; 5 2 4 1 1; 5 3 5 1 1; 5 4 5 1 1; 5 5 5 1 1;
        ];
        fis = addRule(fis, rules);
        writeFIS(fis, [fis_name '.fis']);
        
        figure(2);
        subplot(1, 3, 1); plotmf(fis, 'input', 1); title('Error e'); grid on;
        subplot(1, 3, 2); plotmf(fis, 'input', 2); title('de/dt'); grid on;
        subplot(1, 3, 3); gensurf(fis); title('FLC Surf'); grid on;
        
        fis_created = true;
    catch
        fis_created = false;
    end
end

% standalone surface plot
if ~fis_created
    e_grid  = linspace(-30, 30, 50);
    de_grid = linspace(-200, 200, 50);
    [E, DE] = meshgrid(e_grid, de_grid);
    U = zeros(size(E));
    
    for r = 1:size(E, 1)
        for c = 1:size(E, 2)
            U(r, c) = evaluate_flc(E(r, c), DE(r, c), 1/30, 1/200, 5.0);
        end
    end
    
    figure(2);
    surf(E, DE, U, 'EdgeColor', 'none');
    colormap(jet);
    colorbar;
    title('FLC Surface du = f(e, de)');
    xlabel('e (V)'); ylabel('de/dt (V/s)'); zlabel('du');
    grid on; view(135, 30);
end
