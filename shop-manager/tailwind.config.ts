
import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'sans': ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
				'heading': ['Space Grotesk', 'Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				
				// Modern Primary System
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))',
					dark: 'hsl(var(--primary-dark))'
				},
				
				// Enhanced Secondary
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))',
					light: 'hsl(var(--secondary-light))'
				},
				
				// Interactive States
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))',
					hover: 'hsl(var(--accent-hover))'
				},
				
				// Refined Neutrals
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))',
					light: 'hsl(var(--muted-light))'
				},
				
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				
				// Modern Sidebar
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				
				// Enhanced Work Order System
				'work-order-card': 'hsl(var(--work-order-card))',
				'work-order-card-hover': 'hsl(var(--work-order-card-hover))',
				'work-order-border': 'hsl(var(--work-order-border))',
				'work-order-accent': 'hsl(var(--work-order-accent))',
				'work-order-section': 'hsl(var(--work-order-section))',
				
				// Modern Status System
				'status-pending': 'hsl(var(--status-pending))',
				'status-pending-bg': 'hsl(var(--status-pending-bg))',
				'status-pending-border': 'hsl(var(--status-pending-border))',
				'status-in-progress': 'hsl(var(--status-in-progress))',
				'status-in-progress-bg': 'hsl(var(--status-in-progress-bg))',
				'status-in-progress-border': 'hsl(var(--status-in-progress-border))',
				'status-completed': 'hsl(var(--status-completed))',
				'status-completed-bg': 'hsl(var(--status-completed-bg))',
				'status-completed-border': 'hsl(var(--status-completed-border))',
				'status-cancelled': 'hsl(var(--status-cancelled))',
				'status-cancelled-bg': 'hsl(var(--status-cancelled-bg))',
				'status-cancelled-border': 'hsl(var(--status-cancelled-border))',
				'status-on-hold': 'hsl(var(--status-on-hold))',
				'status-on-hold-bg': 'hsl(var(--status-on-hold-bg))',
				'status-on-hold-border': 'hsl(var(--status-on-hold-border))',
				
				// Priority System
				'priority-low': 'hsl(var(--priority-low))',
				'priority-medium': 'hsl(var(--priority-medium))',
				'priority-high': 'hsl(var(--priority-high))',
				'priority-critical': 'hsl(var(--priority-critical))',
				
				// Semantic Colors
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))',
				error: 'hsl(var(--error))',
				info: 'hsl(var(--info))',
				
				// Enhanced Chart Colors
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))',
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-secondary': 'var(--gradient-secondary)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-status': 'var(--gradient-status)',
			},
			boxShadow: {
				'sm': 'var(--shadow-sm)',
				'DEFAULT': 'var(--shadow)',
				'md': 'var(--shadow-md)',
				'lg': 'var(--shadow-lg)',
				'glow': 'var(--shadow-glow)',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'border-beam': {
					'100%': { 'offset-distance': '100%' }
				},
				'shimmer-slide': {
					to: { transform: 'translate(calc(100cqw - 100%), 0)' }
				},
				'spin-around': {
					'0%': { transform: 'translateZ(0) rotate(0)' },
					'15%, 35%': { transform: 'translateZ(0) rotate(90deg)' },
					'65%, 85%': { transform: 'translateZ(0) rotate(270deg)' },
					'100%': { transform: 'translateZ(0) rotate(360deg)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'border-beam': 'border-beam calc(var(--duration)*1s) infinite linear',
				'shimmer-slide': 'shimmer-slide var(--speed) ease-in-out infinite alternate',
				'spin-around': 'spin-around calc(var(--speed) * 2) infinite linear'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/forms"),
		require("@tailwindcss/typography"),
		require("@tailwindcss/aspect-ratio"),
		require("@tailwindcss/line-clamp"),
	],
} satisfies Config;
