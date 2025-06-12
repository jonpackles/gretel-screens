type Props = {
  location?: string;
};

export default function GretelLogo({ location }: Props) {
  if (location === "Gretel") {
    return <img className="gretel-logo" src="/images/gretel-logo.svg" alt="Gretel" />;
  }
  
  return <span>{location}</span>;
} 