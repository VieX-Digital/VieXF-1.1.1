function RootDiv({ children, style, ...props }) {
  return (
    <div
      className="w-full h-full"
      style={{ ...style }}
      {...props}
    >
      {children}
    </div>
  )
}

export default RootDiv
