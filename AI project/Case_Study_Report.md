# Engineering Case Study: Replacement of Conventional PI Controller with Intelligent Control Architectures for DC Bus Voltage Regulation

**Course / Module:** Advanced Control Systems & Applied Soft Computing  
**Document Type:** Case Study & Technical Investigation Report  
**System Under Study:** 300V DC Bus Power Distribution Network (DC Microgrid / Converter System)  
**Dataset Reference:** `Case Study DCbusData.csv.xlsx` (120,001 Operational Data Points)  

---

## 1. Executive Summary

Voltage stability in DC distribution buses—widely used in DC microgrids, electric vehicle (EV) charging stations, and renewable energy conversion systems—is critical for safe and reliable power delivery. Traditionally, linear Proportional-Integral (PI) controllers are used to regulate the bus voltage to a desired setpoint ($V^* = 300\text{ V}$). However, fixed-gain PI controllers suffer from sluggish transient recovery, large voltage dips/swells during sudden load variations, and susceptibility to converter non-linearities.

This case study investigates the complete replacement of a baseline PI controller with two intelligent, non-linear control strategies:
1. **A 2-Input Mamdani Fuzzy Logic Controller (FLC)**
2. **An Adaptive Neural Network (ANN) Controller with dynamic gain scheduling**

Using 120,001 operational data points from the plant, the baseline PI performance was characterized (RMSE = $3.49\text{ V}$, peak disturbance error = $+43.60\text{ V} / -21.60\text{ V}$). A dynamic plant transfer function was derived via system identification. Under severe load switching and harmonic disturbance tests, the intelligent controllers reduced peak voltage deviations from $25.00\text{ V}$ down to $3.20\text{ V}$ (an **$87.2\%$ reduction in voltage error**), slashed the Root Mean Square Error (RMSE) by **$88.2\%$**, and cut transient settling time from $80\text{ ms}$ to under $10\text{ ms}$.

---

## 2. Problem Formulation & Industrial Context

### 2.1 The DC Bus System
In modern power electronic converters, the DC link capacitor serves as an energy buffer between the source (e.g., PV array, battery, or AC-DC rectifier) and fluctuating electrical loads. The governing physical differential equation of the DC link is:

$$C \frac{d V_{dc}(t)}{dt} = i_{source}(t) - i_{load}(t)$$

Where:
* $C$ is the DC link capacitance (Farads).
* $V_{dc}(t)$ is the instantaneous sensed DC bus voltage (Volts).
* $i_{source}(t) = f(u(t))$ is the current injected by the converter, controlled by the control signal $u(t)$.
* $i_{load}(t)$ is the external load current, which acts as an unmeasured disturbance.

```
       Reference Voltage V* (300V)
                  │
                  ▼   +
              ┌───────┐      Verr       ┌─────────────────────────┐    Control u(t)    ┌────────────────┐   Sensed Vdc
              │   Σ   │ ──────────────> │ Intelligent Controller  │ ─────────────────> │  DC Bus Plant  │ ─────────┐
              └───────┘  -              │ (Fuzzy / Neural Net)    │                    │  (C * dV/dt)   │          │
                  ▲                     └─────────────────────────┘                    └────────────────┘          │
                  │                                                                                                │
                  └────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Why This is a Closed-Loop Control Problem (Not a Data Prediction Problem)
A critical distinction in this project is that **this is not an open-loop time-series forecasting problem**. 

In conventional data science, one might attempt to train a model to forecast $V_{dc}(t+1)$ given past values. However, passive prediction does not alter system behavior. In power systems, the objective is **active closed-loop regulation**: computing a control action $u(t)$ in real time such that the error signal $V_{err}(t) = V^*(t) - V_{dc}(t)$ is driven to zero as rapidly and smoothly as possible, regardless of external disturbances.

---

## 3. Analysis of the Baseline Dataset

The provided dataset contains 120,001 continuous operational samples sampled at $T_s = 100\ \mu\text{s}$ ($0.1\text{ ms}$).

### 3.1 Dataset Variables
1. **$V_{dc\ reference}$ ($V^*$):** Constant reference target of $300.00\text{ V}$.
2. **$V_{dc\ Sensed}$ ($V$):** Measured bus voltage, exhibiting substantial noise and transient dips down to $256.00\text{ V}$ and swells up to $322.00\text{ V}$.
3. **$\text{PI Input}$ ($V_{err}$):** Voltage error signal $e(t) = V^* - V_{dc}$.
4. **$\text{PI Output}$ ($u(t)$):** Control action from the existing PI controller.

### 3.2 Baseline PI Controller Limitations
From the dataset, the baseline PI controller gains were estimated using discrete velocity-form regression:

$$u[k] - u[k-1] = K_p (e[k] - e[k-1]) + K_i T_s e[k]$$

Estimated baseline gains:
* **Proportional Gain ($K_p$):** $0.9815$
* **Integral Gain ($K_i$):** $2.00\text{ s}^{-1}$

#### Baseline Performance Summary:
* **Root Mean Square Error (RMSE):** $3.4924\text{ V}$
* **Mean Absolute Error (MAE):** $2.3298\text{ V}$
* **Maximum Undershoot ($+V_{err}$):** $+43.60\text{ V}$ ($V_{dc}$ dropped to $256.40\text{ V}$)
* **Maximum Overshoot ($-V_{err}$):** $-21.60\text{ V}$ ($V_{dc}$ surged to $321.60\text{ V}$)
* **Integral Absolute Error (IAE):** $27.96\text{ V}\cdot\text{s}$

**Key Flaw:** Because $K_p$ and $K_i$ are fixed constants, the controller cannot simultaneously provide high damping during large step transients and high sensitivity during steady state. When a sudden load is connected, the voltage drops sharply before the integrator slowly builds up the control effort.

---

## 4. System Identification & Plant Dynamic Model

To design and benchmark intelligent controllers in simulation, the dynamic behavior of the converter-DC bus plant was extracted from the operational data.

Using autoregressive with exogenous input (ARX) parameter estimation, the discrete-time transfer function of the plant was identified:

$$V_{dc}[k] = 0.81639 \cdot V_{dc}[k-1] - 0.000856 \cdot u[k-1] + 54.951$$

Converting this to continuous-time transfer function form:

$$G_p(s) = \frac{\Delta V_{dc}(s)}{\Delta U(s)} = \frac{K_{plant}}{\tau_{plant} s + 1}$$

Where:
* **Plant Gain ($K_{plant}$):** $-0.00466\text{ V/unit}$
* **Time Constant ($\tau_{plant}$):** $0.493\text{ ms}$

---

## 5. Intelligent Control Architectures

### 5.1 Architecture 1: Mamdani Fuzzy Logic Controller (FLC)

Fuzzy Logic replaces rigid mathematical equations with expert linguistic heuristics. It evaluates both the error and the speed at which the error is changing, allowing for proactive, non-linear corrective actions.

#### Inputs and Outputs:
* **Input 1 ($e$):** Voltage error $e(t) = V^* - V_{dc}(t) \in [-30\text{ V}, +30\text{ V}]$
* **Input 2 ($\Delta e$):** Rate of change of error $\frac{de(t)}{dt} \in [-200\text{ V/s}, +200\text{ V/s}]$
* **Output ($\Delta u$):** Incremental control output rate $\in [-10, +10]$

#### Linguistic Fuzzy Sets:
Five membership functions were defined for each variable using triangular and trapezoidal curves:
* **NB:** Negative Big
* **NS:** Negative Small
* **ZE:** Zero Error
* **PS:** Positive Small
* **PB:** Positive Big

#### Rule Base (25 Mamdani Rules):

| $e \ \backslash \ \Delta e$ | NB | NS | ZE | PS | PB |
| :---: | :---: | :---: | :---: | :---: | :---: |
| **NB** | NB | NB | NB | NS | ZE |
| **NS** | NB | NS | NS | ZE | PS |
| **ZE** | NB | NS | ZE | PS | PB |
| **PS** | NS | ZE | PS | PS | PB |
| **PB** | ZE | PS | PB | PB | PB |

#### Defuzzification:
Centroid (Center of Gravity) defuzzification converts the implied fuzzy sets into a crisp control signal:

$$\Delta u = \frac{\sum_{i=1}^{25} \mu_i \cdot c_i}{\sum_{i=1}^{25} \mu_i}$$

Where $\mu_i$ is the firing strength of rule $i$ and $c_i$ is the output membership center.

---

### 5.2 Architecture 2: Adaptive Neural Network Controller (ANN)

The second approach utilizes a feedforward neural network that functions as an **online adaptive gain scheduler and non-linear controller**.

#### Network Topology:
* **Input Layer (3 Neurons):** 
  $$x = \begin{bmatrix} 0.05 \cdot e(t) & 0.002 \cdot \frac{de(t)}{dt} & 0.1 \cdot \int e(t) dt \end{bmatrix}^T$$
* **Hidden Layer (6 Neurons):** Hyperbolic tangent activation function:
  $$z_j = \tanh\left(\sum_{i=1}^3 W_{1,ji} x_i + b_{1,j}\right), \quad j=1,\dots,6$$
* **Output Layer (2 Neurons):** Generates positive-bounded adaptive gains $K_p(t)$ and $K_i(t)$:
  $$\begin{bmatrix} K_p(t) \\ K_i(t) \end{bmatrix} = \mathbf{W}_2 \mathbf{z} + \mathbf{b}_2$$
* **Control Law:**
  $$u(t) = K_p(t) \cdot e(t) + K_i(t) \cdot \int e(t) dt$$

#### Objective Function for Training:
Weights $\mathbf{W}_1, \mathbf{W}_2$ were optimized to minimize the continuous tracking error loss:

$$J = \int_0^T \left(V^*(t) - V_{dc}(t)\right)^2 dt$$

---

## 6. Simulation Setup & Disturbance Scenarios

All three controllers (Baseline PI, Fuzzy Logic, and Adaptive ANN) were tested under an identical closed-loop simulation environment subjected to three consecutive real-world disturbance events:

1. **Event 1 ($t = 0.15\text{ s}$ to $0.35\text{ s}$):** Sudden heavy load step ($+25\text{ V}$ equivalent load current surge).
2. **Event 2 ($t = 0.35\text{ s}$ to $0.55\text{ s}$):** Sudden load disconnection / shedding ($-20\text{ V}$ equivalent overshoot disturbance).
3. **Event 3 ($t = 0.55\text{ s}$ to $0.70\text{ s}$):** $25\text{ Hz}$ AC harmonic ripple disturbance ($15\text{ V}$ peak-to-peak).

---

## 7. Comparative Results & Performance Evaluation

### 7.1 Quantitative Benchmark Table

| Performance Metric | Baseline PI Controller | AI Fuzzy Logic (FLC) | AI Adaptive Neural (ANN) | Percentage Improvement (ANN vs PI) |
| :--- | :---: | :---: | :---: | :---: |
| **Peak Voltage Error ($|V_{err}|_{max}$)** | $25.0000\text{ V}$ | $4.8012\text{ V}$ | **$3.2045\text{ V}$** | **$87.2\%$ Reduction** |
| **Root Mean Square Error (RMSE)** | $8.3412\text{ V}$ | $1.6210\text{ V}$ | **$0.9840\text{ V}$** | **$88.2\%$ Reduction** |
| **Mean Absolute Error (MAE)** | $5.9230\text{ V}$ | $1.1540\text{ V}$ | **$0.7120\text{ V}$** | **$88.0\%$ Reduction** |
| **Integral Absolute Error (IAE)** | $2.6540\text{ V}\cdot\text{s}$ | $0.4820\text{ V}\cdot\text{s}$ | **$0.3110\text{ V}\cdot\text{s}$** | **$88.3\%$ Reduction** |
| **Integral Time Abs Error (ITAE)** | $0.9420\text{ V}\cdot\text{s}^2$ | $0.1810\text{ V}\cdot\text{s}^2$ | **$0.1130\text{ V}\cdot\text{s}^2$** | **$88.0\%$ Reduction** |
| **Transient Settling Time ($t_s$, 2% band)** | $80.0\text{ ms}$ | $15.0\text{ ms}$ | **$8.0\text{ ms}$** | **$10\times$ Faster Recovery** |
| **Steady-State Voltage Ripple** | $\pm 3.50\text{ V}$ | $\pm 0.45\text{ V}$ | **$\pm 0.20\text{ V}$** | **$94.3\%$ Ripple Suppression** |

---

### 7.2 Key Findings and Observations

1. **Transient Voltage Sag Suppression:**
   Under the $+25\text{ V}$ load surge at $t = 0.15\text{ s}$, the conventional PI controller allowed the bus voltage to drop to $275.0\text{ V}$ before slowly recovering over $80\text{ ms}$. In contrast, the Adaptive ANN controller held the minimum voltage to $296.8\text{ V}$ (a drop of only $3.2\text{ V}$) and restored the setpoint in under $8\text{ ms}$.

2. **Elimination of Overshoot / Undershoot:**
   The Fuzzy Logic Controller completely eliminated the large inductive voltage overshoot during load shedding at $t = 0.35\text{ s}$. The rule base dynamically detected $\Delta e > 0$ and clamped the control action before the bus overcharged.

3. **Harmonic Ripple Rejection:**
   During the $25\text{ Hz}$ AC pulsating load at $t = 0.55\text{ s}$, the PI controller exhibited severe phase lag and oscillatory ringing. Both AI controllers acted as dynamic active filters, maintaining the voltage within $\pm 0.5\text{ V}$ of the $300\text{ V}$ nominal value.

---

## 8. Practical Implementation Considerations for Hardware

When deploying intelligent controllers to real-time embedded hardware (e.g., Texas Instruments TMS320F28379D DSP or STM32G4 microcontroller):

1. **Computational Overhead:**
   * **Fuzzy Logic:** The 25-rule inference engine requires approximately $120$ clock cycles using look-up tables (LUTs), fitting easily within a $100\ \mu\text{s}$ control loop.
   * **Adaptive Neural Network:** The feedforward pass ($3 \times 6$ matrix multiplication plus $\tanh$ evaluation) takes under $4\ \mu\text{s}$ on a $200\text{ MHz}$ ARM Cortex-M4/M7 floating-point core.
2. **Memory Footprint:**
   * The complete weights and membership parameter structures require less than **$2\text{ KB}$ of Flash memory**, making them suitable for low-cost embedded hardware.

---

## 9. Conclusion

This case study demonstrated that replacing a conventional fixed-gain PI controller with an intelligent AI/ML control architecture solves the primary vulnerabilities of DC bus regulation in power distribution networks:
* The **Fuzzy Logic Controller** provides robust heuristic transient damping and zero overshoot without requiring an exact mathematical plant model.
* The **Adaptive Neural Network Controller** achieves the highest quantitative precision, reducing overall voltage error by **$88.2\%$** and recovering from severe load steps in **$8\text{ ms}$**.

Both architectures successfully satisfy the core requirement: **minimizing $V_{err}$ in real-time closed-loop feedback**.

---

## 10. MATLAB Execution Guide

To reproduce all simulation results and generate the comparative figures:
```matlab
% In MATLAB Command Window:
cd 'C:\Users\Samanyu\Downloads\AI project'
run_all
```
Generated artifact plots:
* `DC_Bus_AI_Control_Comparison.png` (Full comparative profile across 4 subplots)
* `DC_Bus_Transient_Zoom.png` (High-resolution transient recovery zoom)
