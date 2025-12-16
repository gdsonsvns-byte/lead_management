import React from "react";

export interface TextareaProps
    extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: boolean;
    helperText?: string | string[];
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ label, error, helperText, leftIcon, rightIcon, className = "", ...props }, ref) => {
        return (
            <div className="w-full flex flex-col gap-2">
                {label && (
                    <label className="font-medium text-base text-gray-700">
                        {label}
                    </label>
                )}

                <div className="relative w-full">
                    {leftIcon && (
                        <span className="absolute left-3 top-3 text-gray-500">
                            {leftIcon}
                        </span>
                    )}

                    {rightIcon && (
                        <span className="absolute right-3 top-3 text-gray-500 cursor-pointer">
                            {rightIcon}
                        </span>
                    )}

                    <textarea
                        ref={ref}
                        className={`
                            w-full border rounded-lg px-3 py-2 outline-none min-h-28 resize-none
                            focus:ring-2 focus:ring-blue-300 focus:border-blue-300
                            ${leftIcon ? "pl-10" : ""}
                            ${rightIcon ? "pr-10" : ""}
                            ${error ? "border-red-500" : "border-gray-300"}
                            ${className}
                        `}
                        {...props}
                    />
                </div>

                {helperText && (
                    <p className="text-red-500 text-sm">
                        {Array.isArray(helperText)
                            ? helperText.join(", ")
                            : helperText}
                    </p>
                )}
            </div>
        );
    }
);

Textarea.displayName = "Textarea";
export default Textarea;
