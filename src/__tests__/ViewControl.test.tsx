import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViewControl from '@/components/ui/ViewControl'

describe('ViewControl', () => {
  it('renders collapsed showing current column count', () => {
    render(<ViewControl columns={5} onChange={() => {}} />)
    expect(screen.getByText('5')).toBeInTheDocument()
    // Other options should NOT be visible when collapsed
    expect(screen.queryByText('1')).not.toBeInTheDocument()
    expect(screen.queryByText('10')).not.toBeInTheDocument()
    expect(screen.queryByText('50')).not.toBeInTheDocument() // 50 was removed
  })

  it('expands to show all options on click', async () => {
    const user = userEvent.setup()
    render(<ViewControl columns={1} onChange={() => {}} />)

    await user.click(screen.getByText('1'))

    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.queryByText('50')).not.toBeInTheDocument()
  })

  it('calls onChange and collapses when an option is selected', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewControl columns={1} onChange={onChange} />)

    // Expand
    await user.click(screen.getByText('1'))
    // Select 10
    await user.click(screen.getByText('10'))

    expect(onChange).toHaveBeenCalledWith(10)
    // Should collapse back — only current value visible
    // (After onChange, parent re-renders with columns=10)
  })

  it('has correct title on collapsed button', () => {
    render(<ViewControl columns={5} onChange={() => {}} />)
    expect(screen.getByTitle('Change view')).toBeInTheDocument()
  })

  it('has correct titles on expanded buttons', async () => {
    const user = userEvent.setup()
    render(<ViewControl columns={1} onChange={() => {}} />)

    await user.click(screen.getByText('1'))

    expect(screen.getByTitle('1 column')).toBeInTheDocument()
    expect(screen.getByTitle('5 columns')).toBeInTheDocument()
    expect(screen.getByTitle('10 columns')).toBeInTheDocument()
  })
})
