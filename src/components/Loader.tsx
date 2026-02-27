export function Loader({ visible = true }: { visible?: boolean }) {
  return (
    <div className="hamster-loading-wrapper" data-visible={visible}>
      <div className="hamster-spinner">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="hamster-loading-bar" />
        ))}
      </div>
    </div>
  )
}
