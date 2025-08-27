import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function DemoToasts() {
  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        onClick={() =>
          toast('Event has been created', {
            description: 'Sunday, December 03, 2023 at 9:00 AM',
            action: {
              label: 'Undo',
              onClick: () => console.log('Undo'),
            },
          })
        }
      >
        Show Toast
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.success('Success! Workflow created.')}
      >
        Success
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.error('Error! Something went wrong.')}
      >
        Error
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.warning('Warning! Check your inputs.')}
      >
        Warning
      </Button>
      <Button
        variant="outline"
        onClick={() => toast.info('Info: New features available.')}
      >
        Info
      </Button>
    </div>
  )
}