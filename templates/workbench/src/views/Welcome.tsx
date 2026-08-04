const productName = '{{productName}}'

/**
 * A view is a React component. Nothing else — no base class to extend, no
 * lifecycle to implement, and nothing from the runtime to import.
 */
export function Welcome() {
  return (
    <div>
      <h2>Welcome to {productName}</h2>
      <p>
        This view lives in <code>src/views/Welcome.tsx</code>, and <code>src/index.ts</code>{' '}
        contributes it. Edit either one — the window updates without a restart.
      </p>
    </div>
  )
}
