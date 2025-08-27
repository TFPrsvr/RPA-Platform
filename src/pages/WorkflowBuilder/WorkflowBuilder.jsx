import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDrop, useDrag } from 'react-dnd'
import { useUser } from '@clerk/clerk-react'
import { workflowService } from '../../lib/supabase'
import './WorkflowBuilder.css'

const WorkflowBuilder = ({ brandingConfig }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useUser()
  const [workflow, setWorkflow] = useState({
    name: 'New Workflow',
    description: '',
    steps: [],
    status: 'draft'
  })
  const [selectedStep, setSelectedStep] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const availableActions = [
    { id: 'click', name: 'Click Button', type: 'action', icon: '👆', description: 'Click on buttons, links, or any clickable item' },
    { id: 'input', name: 'Fill Form', type: 'action', icon: '✏️', description: 'Enter text into forms and input fields' },
    { id: 'wait', name: 'Wait', type: 'action', icon: '⏱️', description: 'Pause for a specified amount of time' },
    { id: 'navigate', name: 'Open Website', type: 'action', icon: '🌐', description: 'Go to a specific web page or URL' },
    { id: 'condition', name: 'Decision Point', type: 'logic', icon: '🔀', description: 'Make decisions based on conditions' },
    { id: 'loop', name: 'Repeat Steps', type: 'logic', icon: '🔄', description: 'Repeat actions multiple times' }
  ]

  useEffect(() => {
    if (id && user) {
      loadWorkflow()
    }
  }, [id, user])

  const loadWorkflow = async () => {
    try {
      setLoading(true)
      const data = await workflowService.getWorkflow(id, user.id)
      setWorkflow(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const [{ isOver }, drop] = useDrop({
    accept: 'action',
    drop: (item) => {
      const newStep = {
        id: Date.now().toString(),
        type: item.type,
        name: item.name,
        config: {},
        position: { x: 100, y: workflow.steps.length * 80 + 100 }
      }
      setWorkflow(prev => ({
        ...prev,
        steps: [...prev.steps, newStep]
      }))
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  })

  const saveWorkflow = async () => {
    try {
      setLoading(true)
      if (workflow.id) {
        await workflowService.updateWorkflow(workflow.id, {
          name: workflow.name,
          description: workflow.description,
          steps: workflow.steps,
          status: workflow.status
        }, user.id)
      } else {
        await workflowService.createWorkflow(workflow, user.id, user.id)
      }
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateStepConfig = (stepId, key, value) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId 
          ? { ...step, config: { ...step.config, [key]: value } }
          : step
      )
    }))
  }

  const deleteStep = (stepId) => {
    setWorkflow(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
    }))
    setSelectedStep(null)
  }

  const ActionItem = ({ action }) => {
    const [{ isDragging }, drag] = useDrag({
      type: 'action',
      item: action,
      collect: (monitor) => ({
        isDragging: monitor.isDragging()
      })
    })

    return (
      <div
        ref={drag}
        className={`action-item ${isDragging ? 'dragging' : ''}`}
      >
        <span className="action-icon">{action.icon}</span>
        <span className="action-name">{action.name}</span>
      </div>
    )
  }


  if (loading) {
    return (
      <div className="workflow-builder">
        <div className="builder-header">
          <h1>Loading...</h1>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="workflow-builder">
        <div className="builder-header">
          <h1>Error: {error}</h1>
          <button 
            onClick={() => navigate('/')}
            className="cancel-btn"
            style={{ backgroundColor: brandingConfig.secondaryColor }}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="workflow-builder">
      <div className="builder-header">
        <div className="workflow-info">
          <input
            type="text"
            value={workflow.name}
            onChange={(e) => setWorkflow(prev => ({ ...prev, name: e.target.value }))}
            className="workflow-name-input"
            placeholder="Workflow Name"
          />
          <textarea
            value={workflow.description}
            onChange={(e) => setWorkflow(prev => ({ ...prev, description: e.target.value }))}
            className="workflow-description-input"
            placeholder="Workflow Description"
            rows={2}
          />
        </div>
        <div className="builder-actions">
          <button 
            onClick={() => navigate('/')}
            className="cancel-btn"
            style={{ backgroundColor: brandingConfig.secondaryColor }}
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={saveWorkflow}
            className="save-btn"
            style={{ backgroundColor: brandingConfig.primaryColor }}
            disabled={loading}
          >
            {loading ? 'Saving...' : 'Save Workflow'}
          </button>
        </div>
      </div>

      <div className="builder-content">
        <div className="sidebar">
          <h3>📋 Available Steps</h3>
          <p className="sidebar-description">Drag these steps to your workflow to automate tasks</p>
          <div className="actions-list">
            {availableActions.map(action => (
              <ActionItem key={action.id} action={action} />
            ))}
          </div>
        </div>

        <div 
          ref={drop}
          className={`canvas ${isOver ? 'drag-over' : ''}`}
        >
          <div className="canvas-header">
            <h3>🎯 Your Automation Workflow</h3>
            <p>Build your workflow by dragging steps from the left sidebar</p>
          </div>
          
          {workflow.steps.length === 0 ? (
            <div className="empty-canvas">
              <p>✨ Start by dragging a step here to begin automating!</p>
            </div>
          ) : (
            <div className="workflow-steps">
              {workflow.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`workflow-step ${selectedStep?.id === step.id ? 'selected' : ''}`}
                  onClick={() => setSelectedStep(step)}
                >
                  <div className="step-header">
                    <span className="step-number">{index + 1}</span>
                    <span className="step-name">{step.name}</span>
                  </div>
                  <div className="step-config">
                    {Object.keys(step.config).length === 0 ? 'Click to configure' : 'Configured ✓'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="properties-panel">
          <h3>⚙️ Step Configuration</h3>
          {selectedStep ? (
            <div className="properties-content">
              <div className="step-info">
                <h4>📝 {selectedStep.name}</h4>
                <p className="step-description">
                  {availableActions.find(a => a.id === selectedStep.type)?.description || 'Configure this step'}
                </p>
              </div>
              
              <div className="property-form">
                {selectedStep.type === 'click' && (
                  <>
                    <div className="form-group">
                      <label>Button/Link Text:</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Submit, Sign Up, Next"
                        value={selectedStep.config.selector || ''}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'selector', e.target.value)}
                        className="property-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Wait after click:</label>
                      <select 
                        value={selectedStep.config.waitAfter || '1'}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'waitAfter', e.target.value)}
                        className="property-select"
                      >
                        <option value="0">No wait</option>
                        <option value="1">1 second</option>
                        <option value="2">2 seconds</option>
                        <option value="5">5 seconds</option>
                      </select>
                    </div>
                  </>
                )}
                
                {selectedStep.type === 'input' && (
                  <>
                    <div className="form-group">
                      <label>Field Label/Name:</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Email, Name, Message"
                        value={selectedStep.config.fieldName || ''}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'fieldName', e.target.value)}
                        className="property-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Text to enter:</label>
                      <textarea 
                        placeholder="Enter the text to type into this field"
                        value={selectedStep.config.text || ''}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'text', e.target.value)}
                        className="property-textarea"
                        rows="3"
                      />
                    </div>
                  </>
                )}
                
                {selectedStep.type === 'navigate' && (
                  <div className="form-group">
                    <label>Website URL:</label>
                    <input 
                      type="url" 
                      placeholder="https://example.com"
                      value={selectedStep.config.url || ''}
                      onChange={(e) => updateStepConfig(selectedStep.id, 'url', e.target.value)}
                      className="property-input"
                    />
                  </div>
                )}
                
                {selectedStep.type === 'wait' && (
                  <div className="form-group">
                    <label>Wait duration:</label>
                    <select 
                      value={selectedStep.config.duration || '3'}
                      onChange={(e) => updateStepConfig(selectedStep.id, 'duration', e.target.value)}
                      className="property-select"
                    >
                      <option value="1">1 second</option>
                      <option value="2">2 seconds</option>
                      <option value="3">3 seconds</option>
                      <option value="5">5 seconds</option>
                      <option value="10">10 seconds</option>
                      <option value="30">30 seconds</option>
                    </select>
                  </div>
                )}
                
                {selectedStep.type === 'condition' && (
                  <>
                    <div className="form-group">
                      <label>Condition to check:</label>
                      <select 
                        value={selectedStep.config.conditionType || 'element_exists'}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'conditionType', e.target.value)}
                        className="property-select"
                      >
                        <option value="element_exists">Element exists on page</option>
                        <option value="text_contains">Page contains text</option>
                        <option value="url_contains">URL contains text</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Value to check:</label>
                      <input 
                        type="text" 
                        placeholder="Enter text or element to look for"
                        value={selectedStep.config.conditionValue || ''}
                        onChange={(e) => updateStepConfig(selectedStep.id, 'conditionValue', e.target.value)}
                        className="property-input"
                      />
                    </div>
                  </>
                )}
                
                {selectedStep.type === 'loop' && (
                  <div className="form-group">
                    <label>Number of times to repeat:</label>
                    <select 
                      value={selectedStep.config.iterations || '3'}
                      onChange={(e) => updateStepConfig(selectedStep.id, 'iterations', e.target.value)}
                      className="property-select"
                    >
                      <option value="2">2 times</option>
                      <option value="3">3 times</option>
                      <option value="5">5 times</option>
                      <option value="10">10 times</option>
                      <option value="custom">Custom number</option>
                    </select>
                  </div>
                )}
              </div>
              
              <div className="step-actions">
                <button 
                  className="delete-step-btn"
                  onClick={() => deleteStep(selectedStep.id)}
                >
                  🗑️ Remove Step
                </button>
              </div>
            </div>
          ) : (
            <div className="properties-content">
              <div className="no-selection">
                <p>👈 Click on a step in your workflow to configure it</p>
                <div className="help-tips">
                  <h5>💡 Tips:</h5>
                  <ul>
                    <li>Drag steps from the sidebar to add them</li>
                    <li>Click on any step to customize it</li>
                    <li>Steps run from top to bottom</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default WorkflowBuilder