function [u, du] = evaluate_ann_controller(e, de, varargin)

% neural non-linear mapping (tanh hidden layer)
z1 = tanh(0.3 * e + 0.005 * de);
z2 = tanh(1.2 * e - 0.002 * de);

% incremental neural effort
du = 1.8 * z1 + 0.9 * z2;
u = du;

end
