import { InputHTMLAttributes } from "react"

interface ToggleProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
}

const Toggle = ({ className, checked, onChange, disabled, ...props }: ToggleProps) => {
    return (
        <label className={`relative inline-flex items-center cursor-pointer shrink-0 ${className || ""}`}>
            <input
                type="checkbox"
                className="sr-only peer"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
                {...props}
            />
            <div
                className="
          w-9 h-5 rounded-full peer 
          bg-vie-border peer-focus:outline-none 
          peer-checked:bg-vie-primary 
          after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
          after:bg-white after:rounded-full after:h-4 after:w-4 
          after:transition-all after:shadow-sm
          peer-checked:after:translate-x-full
          hover:bg-vie-border-hover
          transition-colors duration-200
        "
            ></div>
        </label>
    )
}

export default Toggle
