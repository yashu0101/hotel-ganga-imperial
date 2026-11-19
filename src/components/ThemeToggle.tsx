"use client";
import {useApp} from "@/lib/context";
export default function ThemeToggle(){const {theme,setTheme}=useApp();return <button type="button" className="theme-switch" aria-label={"Switch to "+(theme==='dark'?'light':'dark')+" theme"} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?'Light view ☀':'Dark view ☾'}</button>}
