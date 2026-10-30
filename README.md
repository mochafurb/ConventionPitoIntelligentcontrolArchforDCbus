# AI / Machine Learning Control Systems Engineering Case Studies

This repository contains full technical implementations, mathematical derivations, simulation models, and formal reports for two digital assignments in Advanced Control Systems and Applied Soft Computing.

---

## Part 1: Digital Assignment - 1
### DC Bus Voltage Regulation (Replacing Classical PI Controller with Fuzzy Logic & ANN)

* **System Under Study:** 300 V DC Bus Distribution Link (DC Microgrid / Converter System)
* **Dataset Reference:** `Case Study DCbusData.csv.xlsx` (120,001 Operational Data Points)
* **Techniques Implemented:**
  1. Conventional PI Controller (Estimated Baseline: $K_p = 1.00$, $K_i = 30.0$)
  2. 2-Input Mamdani Fuzzy Logic Controller (FLC with 25 rules)
  3. Adaptive Neural Network (ANN) Controller with dynamic gain scheduling
* **Key Report:** [`Case_Study_Report.md`](file:///c:/Users/Samanyu/Downloads/AI%20project/Case_Study_Report.md) / [`Case_Study_Report.pdf`](file:///c:/Users/Samanyu/Downloads/AI%20project/Case_Study_Report.pdf)
* **Master Script:** `run_all.m`

---

## Part 2: Digital Assignment - 2
### Water Tank Level Regulation (TD3 Reinforcement Learning vs LSTM vs Conventional PI)

Based on official MathWorks Reinforcement Learning documentation:  
[MathWorks: Tune PI Controller Using Reinforcement Learning (TD3)](https://in.mathworks.com/help/releases/R2025b/reinforcement-learning/ug/tune-pi-controller-using-td3.html)

### 1. Assignment Objectives & Requirements Mapping
* **Step 1 & 2:** Compatible with MATLAB R2024b / R2025b utilizing Reinforcement Learning Toolbox and Deep Learning Toolbox.
* **Step 3:** Executable in MATLAB Desktop, MATLAB Online, or MATLAB Live Script for the benchmark water-tank system.
* **Step 4 - Uploading Models and Agents in Command Window:**
  * Model: `rlwatertankPIDTune.slx`
  * Pretrained TD3 Agent: `WaterTankPIDtd3.mat`
  * Supporting Basis Function: `myBasisFcn.m`
  * Command to load pretrained agent:
    ```matlab
    load("WaterTankPIDtd3.mat", "agent")
    ```
* **Step 5 - Replace PI Controller with LSTM:**
  * Uses the same water-tank plant model.
  * Replaces the PI block with an **LSTM Recurrent Neural Network** considering a sliding window of the **previous 4 memory samples**:
    $$\mathbf{X}[k] = [e[k-3], e[k-2], e[k-1], e[k]]^T$$
* **Step 6 - Comparative Result:**
  * Direct comparison of the **highlighted area error output signal**:
    $$e(t) = \text{Desired water level} - \text{feed back} = r(t) - y(t)$$
  * Benchmarked across **Conventional PI**, **TD3-RL Agent**, and **LSTM (4 Memory Samples)**.

---

### 2. Closed-Loop System Architecture

```
    Desired Water Level (r = 10)
              │
              ▼   +
          ┌───────┐  Highlighted Error Signal e(t)  ┌────────────────────────┐  u(t)  ┌───┐  u + noise  ┌────────────────────┐  Water Level y(t)
          │   Σ   │ ──────────────────────────────> │       Controller       │ ─────> │ Σ │ ───────────> │ Water-Tank System  │ ─────────┬───────> Scope
          └───────┘  -                              │  [PI / TD3-RL / LSTM]  │        └───┘             │  (A * dh/dt = ...) │          │
              ▲                                     └────────────────────────┘          ▲               └────────────────────┘          │
              │                                                 │                       │                                               │
              │                                                 │                       └── Process Noise / Disturbance                 │
              │                                                 ▼                                                                       │
              │                                      ┌───────────────────────┐                                                          │
              │                                      │    calculate cost     │ ───────> Cumulative Cost J                               │
              │                                      │ (e^2 + 0.01 * u^2)    │                                                          │
              │                                      └───────────────────────┘                                                          │
              │                                                                                                                         │
              └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 3. Plant Physical Dynamics & Small-Signal Linearization

* **Mass-Balance Differential Equation:**
  $$A \frac{dh(t)}{dt} = b \cdot (u(t) + n(t)) - a \sqrt{h(t)}$$
  * $A = 20.0\text{ m}^2$ (Tank cross-sectional area)
  * $b = 1.0\text{ m}^3/(\text{s}\cdot\text{unit})$ (Pump gain)
  * $a = 1.0\text{ m}^{2.5}/\text{s}$ (Torricelli drain outflow coefficient)
  * $n(t)$ = Stochastic disturbance / process turbulence
* **Equilibrium Inflow at Setpoint $h_{ref} = 10.0\text{ m}$:**
  $$u_0 = \frac{a}{b} \sqrt{h_{ref}} = \sqrt{10.0} \approx 3.1623$$
* **Linearized Transfer Function:**
  $$G_p(s) = \frac{\Delta H(s)}{\Delta U(s)} = \frac{6.3245}{126.49 s + 1}$$

---

### 4. Step 6 Benchmark Results: Highlighted Error Output Signal Comparison

The highlighted error output signal $e(t) = r(t) - y(t)$ is recorded across all 601 time steps ($T_s = 0.1\text{ s}$, $T_f = 60\text{ s}$) under empty-tank initial conditions ($h(0) = 0\text{ m}$) and a step disturbance active from $t = 35\text{ s}$ to $45\text{ s}$ ($\Delta d = -0.60$):

| Performance Metric | Conventional PI (Untuned) | TD3-RL Agent (`WaterTankPIDtd3`) | LSTM (4 Memory Samples) | Relative Improvement |
| :--- | :---: | :---: | :---: | :---: |
| **Peak Error $|e|_{max}$ (m)** | $10.000\text{ m}$ | $10.000\text{ m}$ | $10.000\text{ m}$ | Identical (Physical Initial Condition) |
| **Total Horizon RMSE (m)** | $3.735\text{ m}$ | **$3.627\text{ m}$** | $3.629\text{ m}$ | **$2.9\%$ Reduction** |
| **Steady-State RMSE ($t \ge 25\text{ s}$) (m)** | $0.796\text{ m}$ | **$0.182\text{ m}$** | $0.296\text{ m}$ | **$77.2\%$ Reduction** |
| **Mean Absolute Error (MAE) (m)** | $2.535\text{ m}$ | **$2.112\text{ m}$** | $2.144\text{ m}$ | **$16.7\%$ Reduction** |
| **Integral Absolute Error (IAE) ($\text{m}\cdot\text{s}$)** | $152.340$ | **$126.902$** | $128.850$ | **$16.7\%$ Reduction** |
| **Integral Time-Abs Error (ITAE) ($\text{m}\cdot\text{s}^2$)** | $2009.249$ | **$1192.834$** | $1252.519$ | **$40.6\%$ Reduction** |
| **Cumulative Control Cost $J$** | $864.199$ | **$818.805$** | $820.669$ | **$5.3\%$ Reduction** |
| **Settling Time ($t_s$ to $\pm 2\%$) (s)** | $54.50\text{ s}$ | **$29.10\text{ s}$** | $41.00\text{ s}$ | **$46.6\%$ Faster Settling** |

---

### 5. Generated Visualizations

1. **[`Water_Tank_Error_Comparison.png`](file:///c:/Users/Samanyu/Downloads/AI%20project/Water_Tank_Error_Comparison.png):**  
   Primary Step 6 deliverable: Comparison of the highlighted area $[ \text{Desired water level} - \text{feed back} ]$ error output signal, showing both full transient and zoomed steady-state / disturbance rejection views.
2. **[`Water_Tank_Level_Tracking.png`](file:///c:/Users/Samanyu/Downloads/AI%20project/Water_Tank_Level_Tracking.png):**  
   Closed-loop water height $y(t)$ tracking the $10\text{ m}$ reference setpoint, along with the pump control effort $u(t) \in [0, 10]$.
3. **[`Water_Tank_Metrics_BarChart.png`](file:///c:/Users/Samanyu/Downloads/AI%20project/Water_Tank_Metrics_BarChart.png):**  
   Quantitative performance comparison bar chart across Total RMSE, Steady-State RMSE, IAE, and Settling Time.

---

### 6. Repository File Structure & MATLAB Scripts

| File Name | Description |
| :--- | :--- |
| [`run_all_da2.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/run_all_da2.m) | **Master Script (DA-2):** Runs the full Digital Assignment - 2 pipeline end-to-end. |
| [`myBasisFcn.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/myBasisFcn.m) | Supporting MATLAB function mapping observation vector into TD3 actor features. |
| [`WaterTankPIDtd3.mat`](file:///c:/Users/Samanyu/Downloads/AI%20project/WaterTankPIDtd3.mat) | Pretrained MAT-file containing the TD3 agent policy and tuned gains ($K_p = 4.25, K_i = 0.38$). Loaded via `load("WaterTankPIDtd3.mat", "agent")`. |
| [`LSTM_WaterTank_Weights.mat`](file:///c:/Users/Samanyu/Downloads/AI%20project/LSTM_WaterTank_Weights.mat) | Pretrained weight matrices and biases for the 4-memory-sample LSTM controller. |
| [`evaluate_lstm_controller.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/evaluate_lstm_controller.m) | Standalone inference function executing the forward pass of the LSTM controller with 4 memory samples. |
| [`create_lstm_controller.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/create_lstm_controller.m) | Generates dynamic training trajectories and calibrates the LSTM weights. |
| [`run_watertank_comparison.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/run_watertank_comparison.m) | Closed-loop comparative benchmark simulating Conventional PI, TD3-RL, and LSTM side-by-side. |
| [`generate_watertank_simulink.m`](file:///c:/Users/Samanyu/Downloads/AI%20project/generate_watertank_simulink.m) | Programmatically constructs `rlwatertankPIDTune.slx` and `watertank_comparison.slx`. |
| [`Digital_Assignment_2_Report.md`](file:///c:/Users/Samanyu/Downloads/AI%20project/Digital_Assignment_2_Report.md) | Comprehensive technical Markdown report for Digital Assignment - 2. |
| [`Digital_Assignment_2_Report.html`](file:///c:/Users/Samanyu/Downloads/AI%20project/Digital_Assignment_2_Report.html) | Styled HTML report ready for web viewing and browser print. |
| [`Digital_Assignment_2_Report.pdf`](file:///c:/Users/Samanyu/Downloads/AI%20project/Digital_Assignment_2_Report.pdf) | Compiled 3-page academic PDF report ready for submission. |

---

### 7. How to Run in MATLAB

1. Open MATLAB (or MATLAB Online) and set the current working directory:
   ```matlab
   cd 'C:\Users\Samanyu\Downloads\AI project'
   ```
2. To execute the **Digital Assignment - 2** full pipeline:
   ```matlab
   run_all_da2
   ```
3. To load the pretrained TD3 agent as specified in Step 4:
   ```matlab
   load("WaterTankPIDtd3.mat", "agent")
   ```
4. To run individual components:
   * Benchmark simulation and plots: `run_watertank_comparison`
   * LSTM training and calibration: `create_lstm_controller`
   * Simulink model generator: `generate_watertank_simulink`
