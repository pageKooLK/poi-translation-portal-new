import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  children?: React.ReactNode
}

interface TabsListProps {
  className?: string
  children?: React.ReactNode
}

interface TabsTriggerProps {
  value: string
  className?: string
  children?: React.ReactNode
}

interface TabsContentProps {
  value: string
  className?: string
  children?: React.ReactNode
}

const TabsContext = React.createContext<{
  value?: string
  onValueChange?: (value: string) => void
}>({})

const Tabs = ({ defaultValue, value, onValueChange, className, children, ...props }: TabsProps) => {
  const [internalValue, setInternalValue] = React.useState(defaultValue)
  const currentValue = value || internalValue
  
  const handleValueChange = (newValue: string) => {
    if (!value) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }

  return (
    <TabsContext.Provider value={{ value: currentValue, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)} {...props}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const TabsList = ({ className, children, ...props }: TabsListProps) => (
  <div
    className={cn(
      "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

const TabsTrigger = ({ value, className, children, ...props }: TabsTriggerProps) => {
  const { value: contextValue, onValueChange } = React.useContext(TabsContext)
  const isActive = contextValue === value

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive 
          ? "bg-background text-foreground shadow-sm" 
          : "hover:bg-muted hover:text-foreground",
        className
      )}
      onClick={() => onValueChange?.(value)}
      {...props}
    >
      {children}
    </button>
  )
}

const TabsContent = ({ value, className, children, ...props }: TabsContentProps) => {
  const { value: contextValue } = React.useContext(TabsContext)
  
  if (contextValue !== value) {
    return null
  }

  return (
    <div
      className={cn(
        "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }