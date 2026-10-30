function u = evaluate_flc(e, de, Ke, Kde, Ku)

if nargin < 3, Ke = 0.1; end
if nargin < 4, Kde = 0.005; end
if nargin < 5, Ku = 2.0; end

% norm inputs to [-1, 1]
e_norm  = max(-1, min(1, e * Ke));
de_norm = max(-1, min(1, de * Kde));

% mf centers: NB, NS, ZE, PS, PB
centers = [-1.0, -0.5, 0.0, 0.5, 1.0];

% calc mf for e
mu_e = zeros(1, 5);
mu_e(1) = max(0, min(1, (-e_norm - 0.5) / 0.5)); if e_norm <= -1, mu_e(1) = 1; end
mu_e(2) = trimf(e_norm, [-1.0, -0.5, 0.0]);
mu_e(3) = trimf(e_norm, [-0.5,  0.0, 0.5]);
mu_e(4) = trimf(e_norm, [ 0.0,  0.5, 1.0]);
mu_e(5) = max(0, min(1, (e_norm - 0.5) / 0.5)); if e_norm >= 1, mu_e(5) = 1; end

% calc mf for de
mu_de = zeros(1, 5);
mu_de(1) = max(0, min(1, (-de_norm - 0.5) / 0.5)); if de_norm <= -1, mu_de(1) = 1; end
mu_de(2) = trimf(de_norm, [-1.0, -0.5, 0.0]);
mu_de(3) = trimf(de_norm, [-0.5,  0.0, 0.5]);
mu_de(4) = trimf(de_norm, [ 0.0,  0.5, 1.0]);
mu_de(5) = max(0, min(1, (de_norm - 0.5) / 0.5)); if de_norm >= 1, mu_de(5) = 1; end

% 5x5 rule base
RuleTable = [
    1, 1, 1, 2, 3;
    1, 2, 2, 3, 4;
    1, 2, 3, 4, 5;
    2, 3, 4, 4, 5;
    3, 4, 5, 5, 5
];

% min-max + defuzz
num = 0;
den = 0;
for i = 1:5
    for j = 1:5
        w = min(mu_e(i), mu_de(j));
        val = centers(RuleTable(i, j));
        num = num + w * val;
        den = den + w;
    end
end

if den == 0
    u_norm = 0;
else
    u_norm = num / den;
end

u = u_norm * Ku;

end

function mu = trimf(x, p)
a = p(1); b = p(2); c = p(3);
if x <= a || x >= c
    mu = 0;
elseif x == b
    mu = 1;
elseif x > a && x < b
    mu = (x - a) / (b - a);
else
    mu = (c - x) / (c - b);
end
end
