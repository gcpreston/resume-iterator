import { render, screen, waitFor } from "@testing-library/react";
import { act } from "react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import Home from "../app/page";

// Mock fetch to prevent actual API calls
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("Resume Iterator Web App", () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  describe("Layout Tests", () => {
    it("renders the main header with title", () => {
      render(<Home />);

      expect(screen.getByText("Resume Iterator Chat")).toBeInTheDocument();
    });

    it("renders the two-column layout", () => {
      render(<Home />);

      // Left column - Resume section
      expect(screen.getByText("Resume/CV")).toBeInTheDocument();
      expect(
        screen.getByText("Paste or type your resume content here")
      ).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText("Paste your resume or CV content here...")
      ).toBeInTheDocument();

      // Right column - Chat section
      expect(screen.getByText("Chat")).toBeInTheDocument();
      expect(
        screen.getByText("Get feedback and suggestions for your resume")
      ).toBeInTheDocument();
    });

    it("renders the chat input area", () => {
      render(<Home />);

      expect(
        screen.getByPlaceholderText("Type your message here...")
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument();
    });

    it("shows welcome message when no chat messages exist", () => {
      render(<Home />);

      expect(
        screen.getByText("Start chatting to get feedback on your resume!")
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          "This assistant will help you iterate on your resume or CV."
        )
      ).toBeInTheDocument();
    });
  });

  describe("Resume Text Area Tests", () => {
    it("allows typing in the resume text area", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const resumeTextArea = screen.getByPlaceholderText(
        "Paste your resume or CV content here..."
      );
      const sampleResume =
        "John Doe\\nSoftware Engineer\\n\\nExperience:\\n- 5 years in web development";

      await act(async () => {
        await user.type(resumeTextArea, sampleResume);
      });

      expect(resumeTextArea).toHaveValue(sampleResume);
    });

    it("resume text area is always enabled", () => {
      render(<Home />);

      const resumeTextArea = screen.getByPlaceholderText(
        "Paste your resume or CV content here..."
      );

      expect(resumeTextArea).not.toBeDisabled();
    });
  });

  describe("Chat Input Interactivity Tests", () => {
    it("chat input is always enabled", () => {
      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );

      expect(chatInput).not.toBeDisabled();
    });

    it("allows typing in chat input", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );

      await act(async () => {
        await user.type(chatInput, "Hello, can you help me with my resume?");
      });

      expect(chatInput).toHaveValue("Hello, can you help me with my resume?");
    });
  });

  describe("Send Button Tests", () => {
    it("send button is disabled when message is empty", () => {
      render(<Home />);

      const sendButton = screen.getByRole("button", { name: "Send" });

      expect(sendButton).toBeDisabled();
    });

    it("send button is enabled when message is provided", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
      });

      expect(sendButton).not.toBeDisabled();
    });

    it("send button is disabled during loading", async () => {
      const user = userEvent.setup();

      // Mock a slow API response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      conversationId: "test-id",
                      reply: "Test response",
                      timestamp: new Date().toISOString(),
                    }),
                }),
              100
            );
          })
      );

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      // Should be disabled during loading
      expect(sendButton).toBeDisabled();
    });
  });

  describe("Keyboard Interaction Tests", () => {
    it("Enter key submits message when message is provided", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.keyboard("{Enter}");
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Hello",
          resumeText: "",
          conversationId: null,
        }),
      });
    });

    it("Shift+Enter does not submit message", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.keyboard("{Shift>}{Enter}{/Shift}");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("Enter key does not submit when message is empty", async () => {
      const user = userEvent.setup();
      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );

      await act(async () => {
        await user.click(chatInput);
        await user.keyboard("{Enter}");
      });

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("Message Display Tests", () => {
    it("displays user message after sending", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello, can you help me?");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Hello, can you help me?")).toBeInTheDocument();
      });
    });

    it("clears input after sending message", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(chatInput).toHaveValue("");
      });
    });

    it("shows loading indicator while processing", async () => {
      const user = userEvent.setup();

      // Mock a slow response
      mockFetch.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: () =>
                    Promise.resolve({
                      conversationId: "test-id",
                      reply: "Test response",
                      timestamp: new Date().toISOString(),
                    }),
                }),
              100
            );
          })
      );

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      expect(screen.getByText("Thinking...")).toBeInTheDocument();
    });

    it("hides welcome message when messages exist", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      // Initially shows welcome message
      expect(
        screen.getByText("Start chatting to get feedback on your resume!")
      ).toBeInTheDocument();

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(
            "Start chatting to get feedback on your resume!"
          )
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("Error Handling Tests", () => {
    it("displays error message when API request fails", async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Error: Network error")).toBeInTheDocument();
      });
    });

    it("displays error message when API returns non-ok status", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
      });

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(
          screen.getByText("Error: HTTP error! status: 400")
        ).toBeInTheDocument();
      });
    });

    it("re-enables send button after error", async () => {
      const user = userEvent.setup();

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      render(<Home />);

      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(chatInput, "Hello");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Error: Network error")).toBeInTheDocument();
      });

      // Need to type something in the input again since it was cleared
      await act(async () => {
        await user.type(chatInput, "Try again");
      });

      // Send button should be re-enabled after error
      expect(sendButton).not.toBeDisabled();
    });
  });

  describe("Resume Text Integration Tests", () => {
    it("includes resume text in API request when provided", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      const resumeTextArea = screen.getByPlaceholderText(
        "Paste your resume or CV content here..."
      );
      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      await act(async () => {
        await user.type(resumeTextArea, "John Doe - Software Engineer");
        await user.type(chatInput, "Please review my resume");
        await user.click(sendButton);
      });

      expect(mockFetch).toHaveBeenCalledWith("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "Please review my resume",
          resumeText: "John Doe - Software Engineer",
          conversationId: null,
        }),
      });
    });

    it("maintains resume text during chat interactions", async () => {
      const user = userEvent.setup();

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            conversationId: "test-id",
            reply: "Test response",
            timestamp: new Date().toISOString(),
          }),
      });

      render(<Home />);

      const resumeTextArea = screen.getByPlaceholderText(
        "Paste your resume or CV content here..."
      );
      const chatInput = screen.getByPlaceholderText(
        "Type your message here..."
      );
      const sendButton = screen.getByRole("button", { name: "Send" });

      const resumeContent =
        "John Doe\\nSoftware Engineer\\nExperience: 5 years";

      await act(async () => {
        await user.type(resumeTextArea, resumeContent);
      });

      // Send first message
      await act(async () => {
        await user.type(chatInput, "First message");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText("First message")).toBeInTheDocument();
      });

      // Resume content should still be there
      expect(resumeTextArea).toHaveValue(resumeContent);

      // Send second message
      await act(async () => {
        await user.type(chatInput, "Second message");
        await user.click(sendButton);
      });

      await waitFor(() => {
        expect(screen.getByText("Second message")).toBeInTheDocument();
      });

      // Resume content should still be preserved
      expect(resumeTextArea).toHaveValue(resumeContent);
    });
  });
});
