function feature = myBasisFcn(obs)
% MYBASISFCN Basis function for TD3 PI controller tuning in Water-Tank System
%   Maps observation vector [int_e; e] into feature representation for actor
%   Used with rlContinuousDeterministicActor in MathWorks rlwatertankPIDTune
%
%   Digital Assignment - 2: Water Tank Level Control
%   Inputs:
%       obs - Observation vector: [integral_error; error]
%   Outputs:
%       feature - Feature representation passed to the linear actor weights [Ki; Kp]

    feature = obs;
end
