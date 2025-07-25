# 🔌 多档位电流测量范围优化工具

这是一个用于优化多档位电流测量配置的 Web 工具，通过自动计算和优化采样电阻值，实现最佳的测量范围和精度。适用于需要高精度、宽范围电流测量的场景。

## ✨ 主要功能

- 🎚️ 支持多档位（1-8档）自动配置
- 🔢 可配置 ADC 位数（8-24位）
- ⚡ 自动计算最优采样电阻值
- 📊 实时显示测量范围和精度
- 📈 支持对数/线性坐标切换
- 💾 配置信息导出功能

## 🛠️ 技术特点

- ⚛️ 基于 React + TypeScript 开发
- 🎨 使用 Ant Design 组件库构建界面
- 📈 使用 Chart.js 实现数据可视化
- 📱 支持响应式布局

## 📋 参数说明

### 全局配置

| 参数 | 说明 | 范围 |
|------|------|------|
| 档位数量 | 设置需要配置的测量档位数量 | 1-8档 |
| ADC位数 | 设置 ADC 的分辨率位数 | 8-24位 |
| ADC参考电压 | ADC 的参考电压 | 0.1-5V |
| 测量电压 | 被测电路的供电电压 | 0.1-36V |
| 最大测量电流 | 期望测量的最大电流值 | 0.001-100A |
| 最小测量电流 | 期望测量的最小电流值 | 1-1000nA |
| 滞回带系数 | 档位切换的滞回带比例 | 1-50% |

### 档位配置

| 参数 | 说明 | 单位 |
|------|------|------|
| 采样电阻 | 当前档位的采样电阻值 | Ω |
| 电阻精度 | 采样电阻的精度等级 | % |
| 理论测量范围 | 基于采样电阻和 ADC 分辨率计算的理论可测量范围 | A |
| 实际测量范围 | 考虑滞回带后的实际可用测量范围 | A |
| 电流分辨率 | 当前档位的最小可分辨电流值 | A |
| 负载电阻 | 当前档位可测量的负载电阻范围 | Ω |
| 最大理论误差 | 考虑采样电阻精度和负载电阻影响的最大测量误差 | % |

## 📖 使用说明

1. ⚙️ 设置全局配置参数
2. 🔄 点击"重新生成采样电阻"按钮自动优化配置
3. 📊 查看图表和档位卡片了解详细配置信息
4. 🎛️ 可以手动调整每个档位的采样电阻和精度
5. 💾 使用"导出配置"按钮保存当前配置

## 💻 开发环境要求

- Node.js >= 14.0.0
- npm >= 6.0.0

## 🚀 安装和运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm start

# 构建生产版本
npm run build
```

## ⚠️ 注意事项

- 💡 建议从较大的档位数量开始配置，然后根据实际需求调整
- 🔧 可以通过调整滞回带系数来优化档位切换的稳定性
- 🎨 注意观察档位卡片的背景颜色，绿色表示配置有效，红色表示需要调整
- 📈 使用对数坐标可以更好地观察小电流范围的特性

## �� 许可证

MIT License
