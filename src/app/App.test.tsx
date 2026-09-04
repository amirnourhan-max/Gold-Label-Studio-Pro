import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("Gold Label Studio Pro shell", () => {
  it("renders the application root", () => {
    render(<App />);
    expect(screen.getByTestId("app-shell")).toBeInTheDocument();
    expect(screen.getByText("Gold Label Studio Pro")).toBeInTheDocument();
  });
});
