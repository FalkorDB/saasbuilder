const DashboardHeaderIcon = (props) => {
  const { color = "#17B26A" } = props;
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 38 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M32.4583 11.5231L19 18.9999M19 18.9999L5.54161 11.5231M19 18.9999L19 34.0417M33.25 25.426V12.5739C33.25 12.0314 33.25 11.7602 33.1701 11.5182C33.0994 11.3042 32.9838 11.1077 32.831 10.942C32.6583 10.7546 32.4212 10.6229 31.947 10.3594L20.2303 3.85015C19.7813 3.60069 19.5567 3.47595 19.319 3.42705C19.1085 3.38377 18.8915 3.38377 18.681 3.42705C18.4433 3.47595 18.2187 3.60069 17.7697 3.85016L6.05304 10.3594C5.57879 10.6229 5.34167 10.7546 5.169 10.942C5.01625 11.1077 4.90065 11.3042 4.82993 11.5182C4.75 11.7602 4.75 12.0314 4.75 12.5739V25.426C4.75 25.9686 4.75 26.2398 4.82993 26.4817C4.90065 26.6958 5.01625 26.8922 5.169 27.058C5.34167 27.2454 5.57879 27.3771 6.05304 27.6406L17.7697 34.1498C18.2187 34.3993 18.4433 34.524 18.681 34.5729C18.8915 34.6162 19.1085 34.6162 19.319 34.5729C19.5567 34.524 19.7813 34.3993 20.2303 34.1498L31.947 27.6406C32.4212 27.3771 32.6583 27.2454 32.831 27.058C32.9838 26.8922 33.0994 26.6958 33.1701 26.4817C33.25 26.2398 33.25 25.9686 33.25 25.426Z"
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
export default DashboardHeaderIcon;