import React from "react"
import styled, { keyframes } from "styled-components"

const spin = keyframes`
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
`

const StyledSvg = styled.svg`
  animation: ${spin} 1s linear infinite;
`

const LoadIcon: React.FC = () => (
  <StyledSvg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path
      d="M19.0702 4.95008C23.0402 8.92008 22.9702 15.4 18.8702 19.29C15.0802 22.88 8.93021 22.88 5.13021 19.29C1.02021 15.4 0.950194 8.92008 4.93019 4.95008C8.83019 1.04008 15.1702 1.04008 19.0702 4.95008Z"
      stroke="url(#paint0_diamond_406_2293)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <defs>
      <radialGradient
        id="paint0_diamond_406_2293"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(11.9965 12.0001) scale(29.5035 11.3459)"
      >
        <stop stopColor="white" />
        <stop offset="1" stopColor="white" stopOpacity="0" />
      </radialGradient>
    </defs>
  </StyledSvg>
)

export default LoadIcon
