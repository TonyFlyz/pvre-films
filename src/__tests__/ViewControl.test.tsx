import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ViewControl from '@/components/ui/ViewControl'

describe('ViewControl', () => {
  it('renders all column options (1, 5, 10, 50)', () => {
    render(<ViewControl columns={1} onChange={() => {}} />)
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('highlights the active column button', () => {
    render(<ViewControl columns={5} onChange={() => {}} />)
    const activeBtn = screen.getByText('5')
    expect(activeBtn.className).toContain('bg-white')
    expect(activeBtn.className).toContain('text-black')

    const inactiveBtn = screen.getByText('1')
    expect(inactiveBtn.className).toContain('bg-zinc-900')
  })

  it('calls onChange with correct column count on click', async () => {
    const onChange = vi.fn()
    const user = userEvent.setup()
    render(<ViewControl columns={1} onChange={onChange} />)

    await user.click(screen.getByText('10'))
    expect(onChange).toHaveBeenCalledWith(10)

    await user.click(screen.getByText('50'))
    expect(onChange).toHaveBeenCalledWith(50)
  })

  it('has correct title attributes', () => {
    render(<ViewControl columns={1} onChange={() => {}} />)
    expect(screen.getByTitle('1 column')).toBeInTheDocument()
    expect(screen.getByTitle('5 columns')).toBeInTheDocument()
    expect(screen.getByTitle('10 columns')).toBeInTheDocument()
    expect(screen.getByTitle('50 columns')).toBeInTheDocument()
  })
})
