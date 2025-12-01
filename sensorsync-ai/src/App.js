import React, { useState, useEffect } from 'react';
import './App.css';

const SensorSyncAI = () => {
  const [sensorData, setSensorData] = useState({
    camera: { status: 'active', confidence: 0.95, objects: ['person', 'vehicle', 'obstacle'] },
    lidar: { status: 'active', distance: 12.5, pointCloud: 1024 },
    imu: { status: 'active', acceleration: { x: 0.1, y: -0.2, z: 9.8 }, gyroscope: { x: 0.01, y: 0.02, z: 0.00 } },
    temperature: { status: 'active', value: 23.5, unit: 'C' },
    pressure: { status: 'active', value: 1013.25, unit: 'hPa' }
  });

  const [aiDecision, setAiDecision] = useState({
    action: 'navigate_forward',
    confidence: 0.92,
    reasoning: 'Clear path detected, optimal conditions for forward movement',
    riskLevel: 'low'
  });

  const [systemStatus, setSystemStatus] = useState('operational');
  const [fusionScore, setFusionScore] = useState(0.94);

  // Simulate real-time sensor data updates
  useEffect(() => {
    const interval = setInterval(() => {
      setSensorData(prev => ({
        ...prev,
        lidar: { ...prev.lidar, distance: (Math.random() * 20 + 5).toFixed(1) },
        imu: {
          ...prev.imu,
          acceleration: {
            x: (Math.random() * 0.4 - 0.2).toFixed(2),
            y: (Math.random() * 0.4 - 0.2).toFixed(2),
            z: (9.8 + Math.random() * 0.2 - 0.1).toFixed(2)
          }
        },
        temperature: { ...prev.temperature, value: (20 + Math.random() * 10).toFixed(1) }
      }));

      // Update AI decision based on sensor data
      const newConfidence = Math.random() * 0.3 + 0.7;
      const actions = ['navigate_forward', 'turn_left', 'turn_right', 'stop', 'reverse'];
      const risks = ['low', 'medium', 'high'];
      
      setAiDecision({
        action: actions[Math.floor(Math.random() * actions.length)],
        confidence: newConfidence.toFixed(2),
        reasoning: generateReasoning(),
        riskLevel: risks[Math.floor(Math.random() * risks.length)]
      });

      setFusionScore((Math.random() * 0.2 + 0.8).toFixed(2));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const generateReasoning = () => {
    const reasons = [
      'Optimal sensor fusion achieved, proceeding with planned trajectory',
      'Obstacle detected in proximity, adjusting navigation path',
      'Environmental conditions favorable for autonomous operation',
      'Multi-sensor validation confirms safe operational parameters',
      'Adaptive control engaged based on real-time sensor feedback'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  };

  const getSensorStatusColor = (status) => {
    return status === 'active' ? '#4CAF50' : '#f44336';
  };

  const getRiskColor = (risk) => {
    switch(risk) {
      case 'low': return '#4CAF50';
      case 'medium': return '#FF9800';
      case 'high': return '#f44336';
      default: return '#9E9E9E';
    }
  };

  return (
    <div className="sensorsync-container">
      <header className="header">
        <h1>🤖 SensorSync AI</h1>
        <p>Physical AI Platform for Autonomous Sensor Fusion</p>
        <div className="status-indicator">
          <span className={`status ${systemStatus}`}>{systemStatus.toUpperCase()}</span>
          <span className="fusion-score">Fusion Score: {fusionScore}</span>
        </div>
      </header>

      <div className="dashboard">
        <div className="sensor-grid">
          <div className="sensor-card">
            <h3>📷 Camera Vision</h3>
            <div className="sensor-status" style={{color: getSensorStatusColor(sensorData.camera.status)}}>
              ● {sensorData.camera.status}
            </div>
            <div className="sensor-data">
              <p>Confidence: {sensorData.camera.confidence}</p>
              <p>Objects: {sensorData.camera.objects.join(', ')}</p>
            </div>
          </div>

          <div className="sensor-card">
            <h3>📡 LiDAR</h3>
            <div className="sensor-status" style={{color: getSensorStatusColor(sensorData.lidar.status)}}>
              ● {sensorData.lidar.status}
            </div>
            <div className="sensor-data">
              <p>Distance: {sensorData.lidar.distance}m</p>
              <p>Point Cloud: {sensorData.lidar.pointCloud} points</p>
            </div>
          </div>

          <div className="sensor-card">
            <h3>🧭 IMU Sensor</h3>
            <div className="sensor-status" style={{color: getSensorStatusColor(sensorData.imu.status)}}>
              ● {sensorData.imu.status}
            </div>
            <div className="sensor-data">
              <p>Accel: X:{sensorData.imu.acceleration.x} Y:{sensorData.imu.acceleration.y} Z:{sensorData.imu.acceleration.z}</p>
              <p>Gyro: X:{sensorData.imu.gyroscope.x} Y:{sensorData.imu.gyroscope.y} Z:{sensorData.imu.gyroscope.z}</p>
            </div>
          </div>

          <div className="sensor-card">
            <h3>🌡️ Temperature</h3>
            <div className="sensor-status" style={{color: getSensorStatusColor(sensorData.temperature.status)}}>
              ● {sensorData.temperature.status}
            </div>
            <div className="sensor-data">
              <p>Value: {sensorData.temperature.value}°{sensorData.temperature.unit}</p>
            </div>
          </div>

          <div className="sensor-card">
            <h3>🌪️ Pressure</h3>
            <div className="sensor-status" style={{color: getSensorStatusColor(sensorData.pressure.status)}}>
              ● {sensorData.pressure.status}
            </div>
            <div className="sensor-data">
              <p>Value: {sensorData.pressure.value} {sensorData.pressure.unit}</p>
            </div>
          </div>
        </div>

        <div className="ai-decision-panel">
          <h2>🧠 AI Decision Engine</h2>
          <div className="decision-card">
            <div className="decision-header">
              <h3>Current Decision: {aiDecision.action.replace('_', ' ').toUpperCase()}</h3>
              <div className="confidence-bar">
                <div 
                  className="confidence-fill" 
                  style={{width: `${aiDecision.confidence * 100}%`}}
                ></div>
                <span className="confidence-text">{(aiDecision.confidence * 100).toFixed(0)}% Confidence</span>
              </div>
            </div>
            <div className="decision-details">
              <p><strong>Reasoning:</strong> {aiDecision.reasoning}</p>
              <p><strong>Risk Level:</strong> 
                <span 
                  className="risk-badge" 
                  style={{backgroundColor: getRiskColor(aiDecision.riskLevel)}}
                >
                  {aiDecision.riskLevel.toUpperCase()}
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="fusion-visualization">
          <h2>🔄 Sensor Fusion Visualization</h2>
          <div className="fusion-chart">
            <div className="fusion-circle">
              <div className="fusion-center">
                <span className="fusion-percentage">{(fusionScore * 100).toFixed(0)}%</span>
                <span className="fusion-label">Fusion Accuracy</span>
              </div>
            </div>
            <div className="fusion-metrics">
              <div className="metric">
                <span className="metric-label">Latency</span>
                <span className="metric-value">12ms</span>
              </div>
              <div className="metric">
                <span className="metric-label">Throughput</span>
                <span className="metric-value">240 Hz</span>
              </div>
              <div className="metric">
                <span className="metric-label">Accuracy</span>
                <span className="metric-value">{(fusionScore * 100).toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="footer">
        <p>SensorSync AI - Bridging Physical and Digital Intelligence | Built for the Physical AI Revolution</p>
      </footer>
    </div>
  );
};

export default SensorSyncAI;