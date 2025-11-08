import { Button } from "primereact/button";

export default function List() {
  return <Button onClick={(e) => e.target.blur()}>Create List</Button>;
}
