import { colors } from "src/themeConfig";

const CustomNetworksIcon = () => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M26.6667 16C26.6667 21.891 21.891 26.6667 16 26.6667M26.6667 16C26.6667 10.109 21.891 5.33332 16 5.33332M26.6667 16H5.33332M16 26.6667C10.109 26.6667 5.33332 21.891 5.33332 16M16 26.6667C18.668 23.7457 20.185 19.9552 20.2674 16C20.185 12.0448 18.668 8.25423 16 5.33332M16 26.6667C13.332 23.7457 11.8165 19.9552 11.7341 16C11.8165 12.0448 13.332 8.25423 16 5.33332M5.33332 16C5.33332 10.109 10.109 5.33332 16 5.33332M7.99999 26.6667C7.99999 28.1394 6.80608 29.3333 5.33332 29.3333C3.86056 29.3333 2.66666 28.1394 2.66666 26.6667C2.66666 25.1939 3.86056 24 5.33332 24C6.80608 24 7.99999 25.1939 7.99999 26.6667ZM29.3333 26.6667C29.3333 28.1394 28.1394 29.3333 26.6667 29.3333C25.1939 29.3333 24 28.1394 24 26.6667C24 25.1939 25.1939 24 26.6667 24C28.1394 24 29.3333 25.1939 29.3333 26.6667ZM7.99999 5.33332C7.99999 6.80608 6.80608 7.99999 5.33332 7.99999C3.86056 7.99999 2.66666 6.80608 2.66666 5.33332C2.66666 3.86056 3.86056 2.66666 5.33332 2.66666C6.80608 2.66666 7.99999 3.86056 7.99999 5.33332ZM29.3333 5.33332C29.3333 6.80608 28.1394 7.99999 26.6667 7.99999C25.1939 7.99999 24 6.80608 24 5.33332C24 3.86056 25.1939 2.66666 26.6667 2.66666C28.1394 2.66666 29.3333 3.86056 29.3333 5.33332Z"
        stroke={colors.success500}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export default CustomNetworksIcon;
