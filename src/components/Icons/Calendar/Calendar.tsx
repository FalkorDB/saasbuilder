function CalendarIcon(props) {
  const { color = "#7F56D9" } = props;

  return (
    <svg
      width="18"
      height="20"
      viewBox="0 0 18 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M16.5 8.33342H1.5M12.3333 1.66675V5.00008M5.66667 1.66675V5.00008M5.5 18.3334H12.5C13.9001 18.3334 14.6002 18.3334 15.135 18.0609C15.6054 17.8212 15.9878 17.4388 16.2275 16.9684C16.5 16.4336 16.5 15.7335 16.5 14.3334V7.33342C16.5 5.93328 16.5 5.23322 16.2275 4.69844C15.9878 4.22803 15.6054 3.84558 15.135 3.6059C14.6002 3.33341 13.9001 3.33341 12.5 3.33341H5.5C4.09987 3.33341 3.3998 3.33341 2.86502 3.6059C2.39462 3.84558 2.01217 4.22803 1.77248 4.69844C1.5 5.23322 1.5 5.93328 1.5 7.33341V14.3334C1.5 15.7335 1.5 16.4336 1.77248 16.9684C2.01217 17.4388 2.39462 17.8212 2.86502 18.0609C3.3998 18.3334 4.09987 18.3334 5.5 18.3334Z"
        stroke={color}
        strokeWidth="1.66667"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default CalendarIcon;
