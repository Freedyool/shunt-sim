import React, { useState, useEffect } from 'react';
import 'antd/dist/reset.css';
import { Layout, Typography, InputNumber, Row, Col, Card, Form, Divider, Space, Select, Button, Modal } from 'antd';
import { Chart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
  ChartData,
  ChartOptions,
  BarController,
  LineController
} from 'chart.js';
import { QuestionCircleOutlined, DownloadOutlined } from '@ant-design/icons';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  LogarithmicScale,
  BarController,
  LineController
);

const { Title: AntTitle, Paragraph } = Typography;
const { Content } = Layout;
const { Option } = Select;

// 常见电阻阻值选项（从1mΩ到1MΩ）
const RESISTOR_VALUES = [
  { value: 0.001, label: '1mΩ' },
  { value: 0.002, label: '2mΩ' },
  { value: 0.005, label: '5mΩ' },
  { value: 0.01, label: '10mΩ' },
  { value: 0.02, label: '20mΩ' },
  { value: 0.05, label: '50mΩ' },
  { value: 0.1, label: '100mΩ' },
  { value: 0.2, label: '200mΩ' },
  { value: 0.5, label: '500mΩ' },
  { value: 1, label: '1Ω' },
  { value: 2, label: '2Ω' },
  { value: 5, label: '5Ω' },
  { value: 10, label: '10Ω' },
  { value: 20, label: '20Ω' },
  { value: 50, label: '50Ω' },
  { value: 100, label: '100Ω' },
  { value: 200, label: '200Ω' },
  { value: 500, label: '500Ω' },
  { value: 1000, label: '1kΩ' },
  { value: 2000, label: '2kΩ' },
  { value: 5000, label: '5kΩ' },
  { value: 10000, label: '10kΩ' },
  { value: 20000, label: '20kΩ' },
  { value: 50000, label: '50kΩ' },
  { value: 100000, label: '100kΩ' },
  { value: 200000, label: '200kΩ' },
  { value: 500000, label: '500kΩ' },
  { value: 1000000, label: '1MΩ' },
];

// 电阻精度选项
const RESISTOR_PRECISION = [
  { value: 0.01, label: '0.01%' },
  { value: 0.05, label: '0.05%' },
  { value: 0.1, label: '0.1%' },
  { value: 0.25, label: '0.25%' },
  { value: 0.5, label: '0.5%' },
  { value: 1, label: '1%' },
  { value: 2, label: '2%' },
  { value: 5, label: '5%' },
  { value: 10, label: '10%' },
];

interface ShuntConfig {
  resistance: number;    // 采样电阻值 (Ω)
  resistanceError: number; // 采样电阻误差 (%)
  maxCurrent: number;    // 最大可测量电流 (A)
  minCurrent: number;    // 最小可测量电流 (A)
  precision: number;     // 测量精度 (%)
  currentResolution: number; // 电流分辨率 (A)
  minLoadResistance: number; // 最小负载电阻 (Ω)
  maxLoadResistance: number; // 最大负载电阻 (Ω)
  upThreshold: number;   // 升档电流阈值 (A)
  downThreshold: number; // 降档电流阈值 (A)
  rangeOverlap?: {      // 测量范围交叠信息
    withNext?: boolean; // 是否与下一档交叠
    withPrev?: boolean; // 是否与上一档交叠
    overlapInfo?: string; // 交叠信息描述
    isValid?: boolean;  // 是否有效交叠
  };
}

// 格式化数值显示，自动选择最合适的单位
const formatValue = (value: number, unit: string): string => {
  const units = [
    { value: 1e-12, symbol: 'p' },
    { value: 1e-9, symbol: 'n' },
    { value: 1e-6, symbol: 'μ' },
    { value: 1e-3, symbol: 'm' },
    { value: 1, symbol: '' },
    { value: 1e3, symbol: 'k' },
    { value: 1e6, symbol: 'M' },
  ];

  const absValue = Math.abs(value);
  const unitInfo = units.find(u => absValue >= u.value && absValue < u.value * 1000) || units[0];
  const scaledValue = value / unitInfo.value;
  
  // 根据数值大小选择合适的小数位数
  let precision = 3;
  if (absValue >= 1) precision = 2;
  if (absValue >= 10) precision = 1;
  if (absValue >= 100) precision = 0;
  
  return `${scaledValue.toFixed(precision)} ${unitInfo.symbol}${unit}`;
};

function App() {
  const [numRanges, setNumRanges] = useState<number>(3); // 档位数量
  const [adcBits, setAdcBits] = useState<number>(16); // ADC位数
  const [adcResolution, setAdcResolution] = useState<number>(2.5); // μV/LSB
  const [vbus, setVbus] = useState<number>(3.3); // V
  const [maxCurrent, setMaxCurrent] = useState<number>(1); // A
  const [minCurrent, setMinCurrent] = useState<number>(1000); // nA
  const [hysteresisFactor, setHysteresisFactor] = useState<number>(0.01); // 滞回带系数
  const [shuntConfigs, setShuntConfigs] = useState<ShuntConfig[]>([]);
  const [isLogScale, setIsLogScale] = useState<boolean>(true); // 添加坐标轴类型状态
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  // 计算单个档位的配置
  const calculateShuntConfig = (resistance: number, resistanceError: number, adcBits: number, isFirstRange: boolean = false, isLastRange: boolean = false): ShuntConfig => {
    // 计算ADC相关参数
    const adcSteps = Math.pow(2, adcBits); // ADC位数，例如12位ADC为2^12=4096
    const vshuntLsb = adcResolution * 1e-6; // 分流电压最小分辨率，将μV转换为V
    const vshuntMax = vshuntLsb * adcSteps; // 最大分流电压 = 分辨率 × 2^ADC位数
    
    // 计算该档位的最大电流（基于分流电压限制）
    // 最大电流 = 最大分流电压/采样电阻
    const maxCurrentForRange = vshuntMax / resistance;
    
    // 计算该档位的最小可测量电流（基于ADC分辨率）
    // 最小电流 = 最小可分辨电压 / 采样电阻
    const minCurrentForRange = vshuntLsb / resistance;
    
    // 计算该档位的电流分辨率
    // 电流分辨率 = 最小可分辨电压 / 采样电阻
    const currentResolution = vshuntLsb / resistance;
    
    // 计算升档和降档电流阈值（基于滞回带系数）
    let upThreshold = maxCurrentForRange * (1 - hysteresisFactor);
    let downThreshold = maxCurrentForRange * hysteresisFactor;

    // 对于第一个档位，最大实际测量值等于最大理论测量值
    if (isFirstRange) {
      upThreshold = maxCurrentForRange;
    }
    
    // 对于最后一个档位，最小实际测量值等于最小理论测量值
    if (isLastRange) {
      downThreshold = minCurrentForRange;
    }

    // 计算负载电阻范围（基于实际测量范围和测量电压）
    // 负载电阻 = (测量电压 - 采样电阻压差) / 电流
    // 最小负载电阻 = (测量电压 - 最大压差) / 最大电流（升档阈值）
    // 最大负载电阻 = (测量电压 - 最小压差) / 最小电流（降档阈值）
    const maxVoltageDrop = upThreshold * resistance; // 最大压差
    const minVoltageDrop = downThreshold * resistance; // 最小压差

    // 确保不会出现除以零的情况
    let minLoadResistance = 0;
    let maxLoadResistance = 0;
    
    if (upThreshold > 0) {
      minLoadResistance = (vbus - maxVoltageDrop) / upThreshold;
    }
    
    if (downThreshold > 0) {
      maxLoadResistance = (vbus - minVoltageDrop) / downThreshold;
    }

    // 如果计算结果无效，使用默认值
    if (isNaN(minLoadResistance) || minLoadResistance <= 0) {
      minLoadResistance = 0;
    }
    if (isNaN(maxLoadResistance) || maxLoadResistance <= 0) {
      maxLoadResistance = 0;
    }

    // 计算最大理论误差
    // bias = 采样电阻 * (1 + 电阻精度) / 最小负载电阻
    const maxTheoreticalError = minLoadResistance > 0 ? 
      (resistance * (1 + resistanceError / 100) / minLoadResistance) * 100 : 0;
    
    return {
      resistance,
      resistanceError,
      maxCurrent: maxCurrentForRange,
      minCurrent: minCurrentForRange,
      precision: maxTheoreticalError,
      currentResolution: currentResolution,
      minLoadResistance,
      maxLoadResistance,
      upThreshold,
      downThreshold
    };
  };

  // 自动生成采样电阻值
  const generateShuntResistances = (numRanges: number, maxCurrent: number): number[] => {
    const resistances: number[] = [];
    const usedResistances = new Set<number>(); // 用于跟踪已使用的电阻值
    
    // 计算ADC相关参数
    const adcSteps = Math.pow(2, adcBits);
    const vshuntLsb = adcResolution * 1e-6;
    const vshuntMax = vshuntLsb * adcSteps;
    
    // 计算第一个档位的电阻值（基于最大测量电流）
    // 确保理论最大测量范围大于输入的最大测量电流
    const firstMinResistance = vshuntMax / maxCurrent;
    
    // 找到最接近的标准电阻值
    let currentResistance = RESISTOR_VALUES.reduce((prev, curr) => {
      return Math.abs(curr.value - firstMinResistance) < Math.abs(prev.value - firstMinResistance) ? curr : prev;
    }).value;
    
    // 如果标准值大于最小电阻，找到下一个较小的标准值
    while (currentResistance > firstMinResistance) {
      const currentIndex = RESISTOR_VALUES.findIndex(r => r.value === currentResistance);
      if (currentIndex > 0) {
        currentResistance = RESISTOR_VALUES[currentIndex - 1].value;
      } else {
        break;
      }
    }
    
    // 添加第一个档位的电阻值
    resistances.push(currentResistance);
    usedResistances.add(currentResistance);
    
    // 计算后续档位的电阻值
    for (let i = 1; i < numRanges; i++) {
      // 获取前一个档位的配置
      const prevConfig = calculateShuntConfig(resistances[i-1], 0.1, adcBits, i === 1, false);
      
      // 从当前电阻值开始，尝试所有更大的标准电阻值
      let currentIndex = RESISTOR_VALUES.findIndex(r => r.value === currentResistance);
      let maxValidResistance = currentResistance; // 记录找到的最大有效电阻值
      
      // 遍历所有更大的标准电阻值
      while (currentIndex < RESISTOR_VALUES.length - 1) {
        currentIndex++;
        const testResistance = RESISTOR_VALUES[currentIndex].value;
        
        // 如果这个电阻值已经被使用，继续尝试下一个
        if (usedResistances.has(testResistance)) {
          continue;
        }
        
        // 计算使用这个电阻值时的配置
        const testConfig = calculateShuntConfig(testResistance, 0.1, adcBits, false, i === numRanges - 1);
        
        // 检查是否与前一个档位有交叠
        const hasOverlap = testConfig.upThreshold > prevConfig.downThreshold;
        
        if (hasOverlap) {
          // 找到有效的电阻值，更新最大有效值
          maxValidResistance = testResistance;
        } else {
          // 如果没有交叠，停止搜索
          break;
        }
      }
      
      // 使用找到的最大有效电阻值
      currentResistance = maxValidResistance;
      resistances.push(currentResistance);
      usedResistances.add(currentResistance);
    }
    
    return resistances;
  };

  // 检查测量范围交叠
  const checkRangeOverlap = (configs: ShuntConfig[]): ShuntConfig[] => {
    return configs.map((config, index) => {
      const overlap: { 
        withNext?: boolean; 
        withPrev?: boolean; 
        isValid?: boolean;
      } = {};
      
      // 检查与下一档的交叠
      if (index < configs.length - 1) {
        const nextConfig = configs[index + 1];
        // 使用实际测量范围判断交叠
        const hasOverlap = config.downThreshold < nextConfig.upThreshold;
        overlap.withNext = hasOverlap;
      }
      
      // 检查与上一档的交叠
      if (index > 0) {
        const prevConfig = configs[index - 1];
        // 使用实际测量范围判断交叠
        const hasOverlap = config.upThreshold > prevConfig.downThreshold;
        overlap.withPrev = hasOverlap;
      }
      
      // 判断是否有效交叠
      if (index === 0) {
        // 第一个档位只需要与下一档交叠
        overlap.isValid = overlap.withNext;
      } else if (index === configs.length - 1) {
        // 最后一个档位需要与上一档交叠，且最小实际测量值要小于等于总配置的最小测量电流
        const minCurrentInNA = minCurrent * 1e-9; // 将nA转换为A
        overlap.isValid = overlap.withPrev && config.downThreshold <= minCurrentInNA;
      } else {
        // 中间档位需要与相邻两个档位都交叠
        overlap.isValid = overlap.withNext && overlap.withPrev;
      }
      
      return { ...config, rangeOverlap: overlap };
    });
  };

  // 初始化或更新档位配置
  useEffect(() => {
    const configs: ShuntConfig[] = [];
    
    // 生成采样电阻值
    const resistances = generateShuntResistances(numRanges, maxCurrent);
    
    // 为每个档位计算配置
    for (let i = 0; i < numRanges; i++) {
      const initialError = 0.1; // 默认0.1%的电阻误差
      configs.push(calculateShuntConfig(
        resistances[i], 
        initialError, 
        adcBits,
        i === 0, // 是否是第一个档位
        i === numRanges - 1 // 是否是最后一个档位
      ));
    }
    
    // 检查测量范围交叠
    const configsWithOverlap = checkRangeOverlap(configs);
    setShuntConfigs(configsWithOverlap);
  }, [numRanges, adcBits, maxCurrent, adcResolution, hysteresisFactor, vbus]);

  // 处理电阻值变化
  const handleResistanceChange = (index: number, value: number) => {
    const newConfigs = [...shuntConfigs];
    newConfigs[index] = calculateShuntConfig(
      value, 
      newConfigs[index].resistanceError, 
      adcBits,
      index === 0,
      index === numRanges - 1
    );
    // 重新检查交叠情况
    const configsWithOverlap = checkRangeOverlap(newConfigs);
    setShuntConfigs(configsWithOverlap);
  };

  // 处理电阻精度变化
  const handlePrecisionChange = (index: number, value: number) => {
    const newConfigs = [...shuntConfigs];
    newConfigs[index] = calculateShuntConfig(
      newConfigs[index].resistance, 
      value, 
      adcBits,
      index === 0,
      index === numRanges - 1
    );
    // 重新检查交叠情况
    const configsWithOverlap = checkRangeOverlap(newConfigs);
    setShuntConfigs(configsWithOverlap);
  };

  // 重新生成采样电阻
  const handleRegenerateResistances = () => {
    const resistances = generateShuntResistances(numRanges, maxCurrent);
    const newConfigs = resistances.map((resistance, index) => 
      calculateShuntConfig(
        resistance, 
        shuntConfigs[index].resistanceError, 
        adcBits,
        index === 0, // 是否是第一个档位
        index === numRanges - 1 // 是否是最后一个档位
      )
    );
    // 重新检查交叠情况
    const configsWithOverlap = checkRangeOverlap(newConfigs);
    setShuntConfigs(configsWithOverlap);
  };

  // 准备图表数据
  const chartData: ChartData<'bar' | 'line'> = {
    labels: shuntConfigs.map((_, index) => `档位${index + 1}`),
    datasets: [
      {
        label: '',
        data: shuntConfigs.map(config => config.minCurrent),
        backgroundColor: 'rgba(24, 144, 255, 0.4)',
        borderColor: 'rgb(24, 144, 255)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'stack0',
        type: 'bar'
      },
      {
        label: '理论测量范围',
        data: shuntConfigs.map(config => config.maxCurrent - config.minCurrent),
        backgroundColor: 'rgba(24, 144, 255, 0.8)',
        borderColor: 'rgb(24, 144, 255)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'stack0',
        type: 'bar'
      },
      {
        label: '',
        data: shuntConfigs.map(config => config.downThreshold),
        backgroundColor: 'rgba(82, 196, 26, 0.4)',
        borderColor: 'rgb(82, 196, 26)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'stack1',
        type: 'bar'
      },
      {
        label: '实际测量范围',
        data: shuntConfigs.map(config => config.upThreshold - config.downThreshold),
        backgroundColor: 'rgba(82, 196, 26, 0.8)',
        borderColor: 'rgb(82, 196, 26)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'stack1',
        type: 'bar'
      },
      {
        label: '电流分辨率',
        data: shuntConfigs.map(config => config.currentResolution),
        borderColor: 'rgb(250, 140, 22)',
        backgroundColor: 'rgba(250, 140, 22, 0.1)',
        borderWidth: 2,
        yAxisID: 'y',
        type: 'line',
        tension: 0.4,
        pointStyle: 'circle',
        pointRadius: 4,
        pointHoverRadius: 6
      }
    ]
  };

  const chartOptions: ChartOptions<'bar' | 'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12
          },
          filter: function(legendItem: any, data: any) {
            return legendItem.text !== ''; // 只显示非空标签
          }
        }
      },
      title: {
        display: false
      },
      tooltip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        titleColor: '#000',
        bodyColor: '#666',
        borderColor: '#ddd',
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
        usePointStyle: true,
        filter: function(context: any) {
          return context.dataset.label !== ''; // 只显示非空标签的数据集
        },
        callbacks: {
          title: function(context: any) {
            const index = context[0].dataIndex;
            const config = shuntConfigs[index];
            return [
              `档位 ${index + 1}`,
              `采样电阻: ${formatValue(config.resistance, 'Ω')}`,
              `电阻精度: ${config.resistanceError}%`
            ];
          },
          label: function(context: any) {
            const value = context.raw;
            const config = shuntConfigs[context.dataIndex];
            let label = `${context.dataset.label}: `;
            
            if (context.dataset.label === '理论测量范围') {
              label += `${formatValue(config.minCurrent, 'A')} ~ ${formatValue(config.maxCurrent, 'A')}`;
            } else if (context.dataset.label === '实际测量范围') {
              label += `${formatValue(config.downThreshold, 'A')} ~ ${formatValue(config.upThreshold, 'A')}`;
            } else if (context.dataset.label === '电流分辨率') {
              label += `${formatValue(value, 'A')} (${(value * 1000 / maxCurrent).toFixed(5)}‰ 满量程)`;
            }
            
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        type: isLogScale ? 'logarithmic' : 'linear',
        stacked: true,
        title: {
          display: false
        },
        ticks: {
          callback: function(value: any) {
            return formatValue(value, 'A');
          },
          font: {
            size: 12
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        stacked: true,
        title: {
          display: false
        },
        ticks: {
          font: {
            size: 12
          }
        },
        grid: {
          display: false
        }
      }
    }
  };

  // 导出配置
  const handleExportConfig = () => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      globalConfig: {
        numRanges,
        adcBits,
        adcResolution,
        vbus,
        maxCurrent,
        minCurrent,
        hysteresisFactor
      },
      shuntConfigs: shuntConfigs.map(config => ({
        resistance: config.resistance,
        resistanceError: config.resistanceError,
        maxCurrent: config.maxCurrent,
        minCurrent: config.minCurrent,
        precision: config.precision,
        currentResolution: config.currentResolution,
        minLoadResistance: config.minLoadResistance,
        maxLoadResistance: config.maxLoadResistance,
        upThreshold: config.upThreshold,
        downThreshold: config.downThreshold,
        rangeOverlap: config.rangeOverlap
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `current_measurement_config_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Content style={{ maxWidth: 1400, margin: '0 auto', padding: '32px 24px' }}>
        <Row gutter={[24, 24]}>
          <Col span={24}>
            <Card bordered={false} style={{ background: 'transparent' }}>
              <Space align="center" style={{ width: '100%', justifyContent: 'space-between' }}>
                <Space direction="vertical" size={4}>
                  <AntTitle level={2} style={{ margin: 0 }}>多档位电流测量范围优化工具</AntTitle>
                  <Paragraph style={{ margin: 0, color: '#666' }}>
                    基于可配置ADC位数的测量范围与精度模拟，支持多档位自动优化
                  </Paragraph>
                </Space>
                <Space>
                  <Button 
                    type="text" 
                    icon={<QuestionCircleOutlined />} 
                    onClick={() => setIsHelpVisible(true)}
                    style={{ fontSize: '20px' }}
                  />
                  <Button
                    type="primary"
                    icon={<DownloadOutlined />}
                    onClick={handleExportConfig}
                  >
                    导出配置
                  </Button>
                </Space>
              </Space>
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={8}>
            <Card 
              title="总配置参数" 
              bordered
              style={{ height: '100%' }}
              bodyStyle={{ padding: '20px' }}
            >
              <Form layout="vertical" size="small">
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="档位数量">
                      <InputNumber
                        min={1}
                        max={8}
                        step={1}
                        value={numRanges}
                        onChange={v => setNumRanges(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="测量电压 (V)">
                      <InputNumber
                        min={0.1}
                        max={36}
                        step={0.1}
                        value={vbus}
                        onChange={v => setVbus(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="ADC位数">
                      <InputNumber
                        min={8}
                        max={24}
                        step={1}
                        value={adcBits}
                        onChange={v => setAdcBits(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="ADC分辨率 (μV/LSB)">
                      <InputNumber
                        min={0.1}
                        max={1000}
                        step={0.1}
                        value={adcResolution}
                        onChange={v => setAdcResolution(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="最大分流电压">
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    {formatValue(adcResolution * 1e-6 * Math.pow(2, adcBits), 'V')}
                    <span style={{ fontSize: '12px', color: '#999', marginLeft: '4px' }}>
                      (分辨率 {adcResolution}μV/LSB × 2^{adcBits})
                    </span>
                  </div>
                </Form.Item>
                <Divider style={{ margin: '12px 0' }} />
                <Row gutter={[16, 16]}>
                  <Col span={12}>
                    <Form.Item label="最大测量电流 (A)">
                      <InputNumber
                        min={0.001}
                        max={100}
                        step={0.001}
                        value={maxCurrent}
                        onChange={v => setMaxCurrent(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="最小测量电流 (nA)">
                      <InputNumber
                        min={1}
                        max={1000}
                        step={1}
                        value={minCurrent}
                        onChange={v => setMinCurrent(Number(v))}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="滞回带系数">
                  <InputNumber
                    min={1}
                    max={500}
                    step={1}
                    value={hysteresisFactor * 1000}
                    onChange={v => setHysteresisFactor(Number(v) / 1000)}
                    style={{ width: '100%' }}
                    addonAfter="‰"
                  />
                </Form.Item>
                <Form.Item style={{ marginBottom: 0, marginTop: 24 }}>
                  <Button type="primary" onClick={handleRegenerateResistances} style={{ width: '100%' }}>
                    重新生成采样电阻
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col xs={24} lg={16}>
            <Card 
              title="测量特性" 
              bordered
              style={{ height: '100%' }}
              bodyStyle={{ padding: '20px' }}
              extra={
                <Button 
                  type={isLogScale ? "default" : "primary"}
                  onClick={() => setIsLogScale(!isLogScale)}
                >
                  {isLogScale ? '切换为线性坐标' : '切换为对数坐标'}
                </Button>
              }
            >
              <div style={{ height: '450px' }}>
                <Chart type='bar' options={chartOptions} data={chartData} />
              </div>
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {shuntConfigs.map((config, index) => (
            <Col xs={24} sm={12} md={8} lg={6} key={index}>
              <Card 
                bordered 
                style={{ 
                  background: config.rangeOverlap?.isValid && (index !== 0 || config.maxCurrent >= maxCurrent) ? '#f6ffed' : '#fff2f0',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                  borderColor: config.rangeOverlap?.isValid && (index !== 0 || config.maxCurrent >= maxCurrent) ? '#b7eb8f' : '#ffccc7'
                }}
                bodyStyle={{ padding: '16px' }}
              >
                <AntTitle level={5} style={{ margin: '0 0 16px 0' }}>档位 {index + 1}</AntTitle>
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <Form layout="vertical" size="small">
                    <Form.Item label="采样电阻" style={{ marginBottom: '12px' }}>
                      <Select
                        value={config.resistance}
                        style={{ width: '100%' }}
                        onChange={(value) => handleResistanceChange(index, value)}
                      >
                        {RESISTOR_VALUES.map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                    <Form.Item label="电阻精度" style={{ marginBottom: '12px' }}>
                      <Select
                        value={config.resistanceError}
                        style={{ width: '100%' }}
                        onChange={(value) => handlePrecisionChange(index, value)}
                      >
                        {RESISTOR_PRECISION.map(option => (
                          <Option key={option.value} value={option.value}>
                            {option.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Form>
                  <Divider style={{ margin: '12px 0' }} />
                  <Space direction="vertical" style={{ width: '100%' }} size={6}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>理论测量范围</div>
                      <div style={{ fontSize: '13px' }}>
                        {formatValue(config.minCurrent, 'A')} ~ {formatValue(config.maxCurrent, 'A')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>实际测量范围</div>
                      <div style={{ fontSize: '13px' }}>
                        {formatValue(config.downThreshold, 'A')} ~ {formatValue(config.upThreshold, 'A')}
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                          ({(config.downThreshold / config.maxCurrent * 100).toFixed(1)}% ~ 
                          {(config.upThreshold / config.maxCurrent * 100).toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>电流分辨率</div>
                      <div style={{ fontSize: '13px' }}>{formatValue(config.currentResolution, 'A')}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>负载电阻</div>
                      <div style={{ fontSize: '13px' }}>
                        {formatValue(config.minLoadResistance, 'Ω')} ~ {formatValue(config.maxLoadResistance, 'Ω')}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>最大功耗</div>
                      <div style={{ fontSize: '13px' }}>
                        {formatValue(Math.pow(config.upThreshold, 2) * config.resistance, 'W')}
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                          ({formatValue(config.upThreshold, 'A')}² × {formatValue(config.resistance, 'Ω')})
                        </span>
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>最大理论误差</div>
                      <div style={{ fontSize: '13px' }}>
                        {config.precision.toFixed(2)} %
                        <span style={{ fontSize: '12px', color: '#666', marginLeft: '4px' }}>
                          ({formatValue(config.resistance, 'Ω')} × (1 + {config.resistanceError}%) / {formatValue(config.minLoadResistance, 'Ω')})
                        </span>
                      </div>
                    </div>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>

        <Modal
          title="使用说明"
          open={isHelpVisible}
          onCancel={() => setIsHelpVisible(false)}
          footer={null}
          width={800}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <h3>工具简介</h3>
              <p>本工具用于优化多档位电流测量配置，通过自动计算和优化采样电阻值，实现最佳的测量范围和精度。适用于需要高精度、宽范围电流测量的场景。</p>
            </div>
            
            <div>
              <h3>主要功能</h3>
              <ul>
                <li>支持多档位（1-8档）自动配置</li>
                <li>可配置 ADC 位数（8-24位）</li>
                <li>自动计算最优采样电阻值</li>
                <li>实时显示测量范围和精度</li>
                <li>支持对数/线性坐标切换</li>
              </ul>
            </div>

            <div>
              <h3>参数说明</h3>
              <ul>
                <li><strong>档位数量</strong>：设置需要配置的测量档位数量</li>
                <li><strong>ADC位数</strong>：设置 ADC 的分辨率位数</li>
                <li><strong>ADC分辨率</strong>：ADC 的最小分辨电压</li>
                <li><strong>测量电压</strong>：被测电路的供电电压</li>
                <li><strong>最大测量电流</strong>：期望测量的最大电流值</li>
                <li><strong>最小测量电流</strong>：期望测量的最小电流值</li>
                <li><strong>滞回带系数</strong>：档位切换的滞回带比例</li>
              </ul>
            </div>

            <div>
              <h3>显示说明</h3>
              <ul>
                <li><strong>理论测量范围</strong>：基于采样电阻和 ADC 分辨率计算的理论可测量范围</li>
                <li><strong>实际测量范围</strong>：考虑滞回带后的实际可用测量范围</li>
                <li><strong>电流分辨率</strong>：当前档位的最小可分辨电流值</li>
                <li><strong>负载电阻</strong>：当前档位可测量的负载电阻范围</li>
                <li><strong>最大理论误差</strong>：考虑采样电阻精度和负载电阻影响的最大测量误差</li>
              </ul>
            </div>

            <div>
              <h3>使用建议</h3>
              <ul>
                <li>建议从较大的档位数量开始配置，然后根据实际需求调整</li>
                <li>可以通过调整滞回带系数来优化档位切换的稳定性</li>
                <li>注意观察档位卡片的背景颜色，绿色表示配置有效，红色表示需要调整</li>
                <li>使用对数坐标可以更好地观察小电流范围的特性</li>
              </ul>
            </div>
          </Space>
        </Modal>
      </Content>
    </Layout>
  );
}

export default App;
