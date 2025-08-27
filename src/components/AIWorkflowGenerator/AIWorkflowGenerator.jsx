import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import apiClient from '../../utils/apiClient'
import useAppStore from '../../store/useAppStore'
import { toast } from 'sonner'
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner'
import './AIWorkflowGenerator.css'

export function AIWorkflowGenerator({ onWorkflowGenerated, isModal = false }) {
  const [description, setDescription] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const navigate = useNavigate()
  const user = useAppStore((state) => state.user)

  const examples = [
    "Extract all product prices from an e-commerce website and save to CSV",
    "Fill out a contact form with customer data from a spreadsheet",
    "Monitor a website for changes and send email alerts when updated",
    "Download invoices from email attachments and organize by date",
    "Scrape job postings from LinkedIn and filter by location"
  ]

  const handleGenerate = async () => {
    if (!description.trim()) {
      setError('Please describe what you want to automate')
      return
    }

    setIsGenerating(true)
    setError(null)
    setResult(null)

    try {
      const response = await apiClient.post('/api/workflows/generate-ai', {
        description: description.trim()
      })

      setResult(response.data)
      toast.success('Workflow generated successfully!')

      if (onWorkflowGenerated) {
        onWorkflowGenerated(response.data.workflow)
      }

    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to generate workflow'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseWorkflow = (workflow) => {
    navigate(`/builder/${workflow.id}`)
  }

  const handleExampleClick = (example) => {
    setDescription(example)
    setResult(null)
    setError(null)
  }

  return (
    <div className={`ai-workflow-generator ${isModal ? 'modal' : ''}`}>
      <Card className="ai-generator-card">
        <div className="ai-generator-header">
          <h2>🤖 AI Workflow Generator</h2>
          <p>Describe what you want to automate in plain English</p>
        </div>

        <div className="ai-generator-form">
          <div className="description-input">
            <label htmlFor="description">What do you want to automate?</label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Example: Extract all product names and prices from Amazon search results and save them to a CSV file..."
              maxLength={2000}
              rows={4}
              disabled={isGenerating}
            />
            <div className="character-count">
              {description.length}/2000 characters
            </div>
          </div>

          <div className="examples-section">
            <h4>💡 Try these examples:</h4>
            <div className="examples-grid">
              {examples.map((example, index) => (
                <button
                  key={index}
                  className="example-button"
                  onClick={() => handleExampleClick(example)}
                  disabled={isGenerating}
                >
                  {example}
                </button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleGenerate}
            disabled={!description.trim() || isGenerating}
            className="generate-button"
          >
            {isGenerating ? (
              <>
                <LoadingSpinner size="small" />
                Generating...
              </>
            ) : (
              '✨ Generate Workflow'
            )}
          </Button>
        </div>

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {result && (
          <div className="ai-result">
            <div className="result-header">
              <h3>🎉 Workflow Generated!</h3>
              <div className="confidence-badge">
                Confidence: {Math.round(result.analysis.confidence * 100)}%
              </div>
            </div>

            <div className="workflow-preview">
              <div className="workflow-info">
                <h4>{result.workflow.name}</h4>
                <p>{result.workflow.description}</p>
                <div className="workflow-stats">
                  <span>📋 {result.workflow.steps.length} steps</span>
                  <span>🏷️ {result.workflow.category}</span>
                  <span>🎯 {result.analysis.complexity} complexity</span>
                </div>
              </div>

              <div className="steps-preview">
                <h5>Workflow Steps:</h5>
                <ol className="steps-list">
                  {result.workflow.steps.slice(0, 5).map((step, index) => (
                    <li key={index} className="step-item">
                      <span className="step-type">{step.type}</span>
                      <span className="step-description">{step.description}</span>
                    </li>
                  ))}
                  {result.workflow.steps.length > 5 && (
                    <li className="step-item more-steps">
                      ...and {result.workflow.steps.length - 5} more steps
                    </li>
                  )}
                </ol>
              </div>

              {result.suggestions && result.suggestions.length > 0 && (
                <div className="suggestions">
                  <h5>💡 Suggestions for improvement:</h5>
                  <ul>
                    {result.suggestions.map((suggestion, index) => (
                      <li key={index}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="result-actions">
                <Button 
                  onClick={() => handleUseWorkflow(result.workflow)}
                  className="primary"
                >
                  🛠️ Edit Workflow
                </Button>
                <Button 
                  onClick={() => setResult(null)}
                  className="secondary"
                >
                  Generate Another
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}