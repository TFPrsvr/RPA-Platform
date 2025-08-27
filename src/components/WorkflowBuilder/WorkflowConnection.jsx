import { useMemo } from 'react'
import './WorkflowConnection.css'

const WorkflowConnection = ({ 
  fromNode, 
  toNode, 
  fromPort = 'success', 
  toPort = 'trigger',
  isSelected = false,
  onSelect,
  onDelete 
}) => {
  const connectionPath = useMemo(() => {
    if (!fromNode || !toNode) return ''

    const fromX = fromNode.position.x + 160 // Node width
    const fromY = fromNode.position.y + 40 // Approximate center of node
    const toX = toNode.position.x
    const toY = toNode.position.y + 40

    // Calculate control points for a smooth curve
    const deltaX = toX - fromX
    const deltaY = toY - fromY
    
    const controlOffset = Math.min(Math.max(Math.abs(deltaX) / 2, 50), 150)
    
    const cp1X = fromX + controlOffset
    const cp1Y = fromY
    const cp2X = toX - controlOffset
    const cp2Y = toY

    return `M ${fromX} ${fromY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${toX} ${toY}`
  }, [fromNode, toNode])

  const connectionCenter = useMemo(() => {
    if (!fromNode || !toNode) return { x: 0, y: 0 }
    
    const fromX = fromNode.position.x + 160
    const fromY = fromNode.position.y + 40
    const toX = toNode.position.x
    const toY = toNode.position.y + 40
    
    return {
      x: (fromX + toX) / 2,
      y: (fromY + toY) / 2
    }
  }, [fromNode, toNode])

  if (!fromNode || !toNode) return null

  const getPortColor = (portType) => {
    switch (portType) {
      case 'success': return '#28a745'
      case 'error': return '#dc3545'
      case 'true': return '#007bff'
      case 'false': return '#6c757d'
      case 'iteration': return '#fd7e14'
      case 'complete': return '#20c997'
      default: return '#6c757d'
    }
  }

  const handleConnectionClick = (e) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect()
    }
  }

  const handleDeleteClick = (e) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete()
    }
  }

  return (
    <g className={`workflow-connection ${isSelected ? 'selected' : ''}`}>
      {/* Shadow/outline for better visibility */}
      <path
        d={connectionPath}
        className="connection-shadow"
        strokeWidth="6"
        stroke="#ffffff"
        fill="none"
        opacity="0.8"
      />
      
      {/* Main connection line */}
      <path
        d={connectionPath}
        className="connection-line"
        strokeWidth="3"
        stroke={getPortColor(fromPort)}
        fill="none"
        onClick={handleConnectionClick}
        style={{ cursor: 'pointer' }}
      />

      {/* Connection arrow */}
      <defs>
        <marker
          id={`arrow-${fromNode.id}-${toNode.id}`}
          viewBox="0 0 20 20"
          refX="18"
          refY="10"
          markerWidth="8"
          markerHeight="8"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M0,0 L0,20 L20,10 z"
            fill={getPortColor(fromPort)}
          />
        </marker>
      </defs>
      
      <path
        d={connectionPath}
        className="connection-arrow"
        strokeWidth="3"
        stroke={getPortColor(fromPort)}
        fill="none"
        markerEnd={`url(#arrow-${fromNode.id}-${toNode.id})`}
        onClick={handleConnectionClick}
        style={{ cursor: 'pointer' }}
      />

      {/* Connection label */}
      {fromPort !== 'success' && (
        <text
          x={connectionCenter.x}
          y={connectionCenter.y - 8}
          className="connection-label"
          textAnchor="middle"
          fontSize="11"
          fill={getPortColor(fromPort)}
          fontWeight="600"
          onClick={handleConnectionClick}
          style={{ cursor: 'pointer' }}
        >
          {fromPort}
        </text>
      )}

      {/* Delete button when selected */}
      {isSelected && (
        <g 
          className="connection-delete"
          onClick={handleDeleteClick}
          style={{ cursor: 'pointer' }}
        >
          <circle
            cx={connectionCenter.x}
            cy={connectionCenter.y + 15}
            r="10"
            fill="#dc3545"
            stroke="#ffffff"
            strokeWidth="2"
          />
          <text
            x={connectionCenter.x}
            y={connectionCenter.y + 20}
            textAnchor="middle"
            fontSize="12"
            fill="white"
            fontWeight="bold"
          >
            ×
          </text>
        </g>
      )}
    </g>
  )
}

export default WorkflowConnection