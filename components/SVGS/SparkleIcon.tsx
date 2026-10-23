const SparkleIcon = ({ size = "24", color = "#F6F6FA" }: { size?: string; color?: string }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 25" fill="none">
      <path
        d="M10 12.6242C14.0874 12.6793 15.0591 10.9856 15 5.62424C15.0372 10.9364 16 12.6242 20 12.6242C15.9504 12.6247 15 14.6242 15 19.6242C15.0032 14.3952 14.0632 12.6619 10 12.6242Z"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M4 8.12424C6.0437 8.15178 6.52954 7.30494 6.5 4.62424C6.51861 7.2803 7 8.12424 9 8.12424C6.97518 8.12447 6.5 9.12424 6.5 11.6242C6.5016 9.00971 6.03162 8.14305 4 8.12424Z"
        stroke={color}
        strokeLinejoin="round"
      />
      <path
        d="M8 17.6242C8.83417 17.6355 9.60389 16.7184 9.59184 15.6242C9.59943 16.7083 10.3673 17.6242 11.1837 17.6242C10.3572 17.6243 9.59184 18.6038 9.59184 19.6242C9.59249 18.5571 8.82923 17.6319 8 17.6242Z"
        stroke={color}
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default SparkleIcon
