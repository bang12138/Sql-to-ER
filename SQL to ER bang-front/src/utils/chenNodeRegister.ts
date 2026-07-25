import { Graph } from '@antv/x6'

/**
 * 注册 Chen 风格三种自定义 X6 节点（全局注册，应用启动时仅需调用一次）
 * 使用 try-catch 包裹防止 HMR 热更新或重复调用时抛出异常
 */
export function registerChenNodes() {
  // 1. 实体矩形
  try {
    Graph.registerNode('chen-entity', {
      inherit: 'rect',
      width: 130,
      height: 54,
      attrs: {
        body: {
          fill: '#E8F4FD',
          stroke: '#1890FF',
          strokeWidth: 2,
          rx: 0,
          ry: 0,
        },
        label: {
          fontSize: 14,
          fontWeight: 'bold',
          fill: '#000',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: 0.5,
          refY: 0.5,
        },
      },
      ports: {
        groups: {
          top: { position: 'top', attrs: { circle: { r: 4, fill: '#1890FF' } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 4, fill: '#1890FF' } } },
          left: { position: 'left', attrs: { circle: { r: 4, fill: '#1890FF' } } },
          right: { position: 'right', attrs: { circle: { r: 4, fill: '#1890FF' } } },
        },
      },
    })
  } catch (_) { /* HMR */ }

  // 2. 属性椭圆
  try {
    Graph.registerNode('chen-attribute', {
      inherit: 'ellipse',
      width: 130,
      height: 44,
      attrs: {
        body: {
          fill: '#FFFBE6',
          stroke: '#FAAD14',
          strokeWidth: 1.5,
        },
        label: {
          fontSize: 12,
          fill: '#000',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: 0.5,
          refY: 0.5,
        },
      },
      ports: {
        groups: {
          top: { position: 'top', attrs: { circle: { r: 3, fill: '#FAAD14' } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 3, fill: '#FAAD14' } } },
        },
      },
    })
  } catch (_) { /* HMR */ }

  // 3. 关系菱形
  try {
    Graph.registerNode('chen-relationship', {
      inherit: 'polygon',
      width: 80,
      height: 80,
      attrs: {
        body: {
          fill: '#FFF1F0',
          stroke: '#FF4D4F',
          strokeWidth: 1.5,
          refPoints: '0,0.5 0.5,0 1,0.5 0.5,1',
        },
        label: {
          fontSize: 12,
          fontWeight: 'bold',
          fill: '#000',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          refX: 0.5,
          refY: 0.5,
        },
      },
      ports: {
        groups: {
          top: { position: 'top', attrs: { circle: { r: 3, fill: '#FF4D4F' } } },
          bottom: { position: 'bottom', attrs: { circle: { r: 3, fill: '#FF4D4F' } } },
          left: { position: 'left', attrs: { circle: { r: 3, fill: '#FF4D4F' } } },
          right: { position: 'right', attrs: { circle: { r: 3, fill: '#FF4D4F' } } },
        },
      },
    })
  } catch (_) { /* HMR */ }
}
