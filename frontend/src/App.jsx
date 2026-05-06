import { useState, useRef, useEffect } from "react";
import axios from "axios";

const API = "http://localhost:8000";

const SUGGESTED_QUESTIONS = [
  "Which products are low on stock?",
  "Which items have more orders than stock?",
  "What is the total value of pending orders?",
  "Which warehouse has the most inventory?",
  "Which supplier has the most pending orders?",
];

// SaaS-style theme
const theme = {
  colors: {
    pageBg: "#eef1f7",
    shellBg: "#f9fafb",
    cardBg: "#ffffff",
    subtleBg: "#f5f7fb",
    border: "#e5e7eb",
    borderSoft: "#f3f4f6",
    textPrimary: "#0f172a",
    textSecondary: "#6b7280",
    textMuted: "#9ca3af",
    primary: "#6366f1",
    primaryDark: "#4f46e5",
    primarySoft: "rgba(99,102,241,0.06)",
    accent: "#22c55e",
  },
  radius: {
    shell: 26,
    card: 18,
    smallCard: 16,
    button: 999,
    input: 999,
    chip: 999,
  },
  shadow: {
    shell: "0 32px 80px rgba(15,23,42,0.12)",
    card: "0 20px 60px rgba(15,23,42,0.06)",
    soft: "0 12px 32px rgba(15,23,42,0.04)",
  },
  font: "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const InsightCard = ({ insight }) => {
  const styles = {
    warning: {
      bg: "rgba(245, 158, 11, 0.06)",
      border: "rgba(245, 158, 11, 0.35)",
      icon: "⚠️",
      label: "Warning",
      chipBg: "rgba(245, 158, 11, 0.15)",
      chipColor: "#92400e",
    },
    danger: {
      bg: "rgba(239, 68, 68, 0.06)",
      border: "rgba(239, 68, 68, 0.4)",
      icon: "🚨",
      label: "Alert",
      chipBg: "rgba(239, 68, 68, 0.15)",
      chipColor: "#991b1b",
    },
    info: {
      bg: "rgba(59, 130, 246, 0.05)",
      border: "rgba(59, 130, 246, 0.35)",
      icon: "📊",
      label: "Insight",
      chipBg: "rgba(59, 130, 246, 0.15)",
      chipColor: "#1d4ed8",
    },
  };
  const s = styles[insight.type] || styles.info;

  return (
    <div
      style={{
        background: s.bg,
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 8,
        border: `1px solid ${s.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
          alignItems: "center",
        }}
      >
        <div
          style={{
            fontWeight: 600,
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: theme.colors.textPrimary,
          }}
        >
          <span style={{ fontSize: 15 }}>{s.icon}</span>
          {insight.title}
        </div>
        <span
          style={{
            fontSize: 11,
            padding: "2px 8px",
            borderRadius: theme.radius.chip,
            background: s.chipBg,
            color: s.chipColor,
            fontWeight: 500,
          }}
        >
          {s.label}
        </span>
      </div>
      <div
        style={{
          fontSize: 12.5,
          color: theme.colors.textSecondary,
          lineHeight: 1.6,
        }}
      >
        {insight.body}
      </div>
    </div>
  );
};

const PreviewTable = ({ columns, rows }) => (
  <div
    style={{
      overflowX: "auto",
      marginTop: 12,
      borderRadius: 12,
      border: `1px solid ${theme.colors.border}`,
      background: "#ffffff",
      boxShadow: theme.shadow.soft,
    }}
  >
    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
        fontSize: 12,
      }}
    >
      <thead>
        <tr style={{ background: "#f9fafb" }}>
          {columns.map((col) => (
            <th
              key={col}
              style={{
                padding: "9px 12px",
                textAlign: "left",
                borderBottom: `1px solid ${theme.colors.border}`,
                whiteSpace: "nowrap",
                color: "#4b5563",
                fontWeight: 600,
              }}
            >
              {col}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr
            key={i}
            style={{
              borderBottom: `1px solid ${theme.colors.borderSoft}`,
            }}
          >
            {columns.map((col) => (
              <td
                key={col}
                style={{
                  padding: "7px 12px",
                  whiteSpace: "nowrap",
                  color: "#111827",
                }}
              >
                {row[col]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <div
      style={{
        padding: "7px 12px",
        fontSize: 11,
        color: theme.colors.textMuted,
        background: theme.colors.subtleBg,
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>Showing first 5 rows</span>
      <span>Columns: {columns.length}</span>
    </div>
  </div>
);

export default function App() {
  const [file, setFile] = useState(null);
  const [uploadData, setUploadData] = useState(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleUpload = async (selectedFile) => {
    const f = selectedFile || file;
    if (!f) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", f);
    try {
      const res = await axios.post(`${API}/upload`, formData);
      setUploadData(res.data);
      setMessages([]);
    } catch (err) {
      alert("Upload failed: " + (err.response?.data?.detail || err.message));
    }
    setUploading(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped?.name.endsWith(".csv")) {
      setFile(dropped);
      handleUpload(dropped);
    } else {
      alert("Please drop a CSV file.");
    }
  };

  const handleAsk = async (q) => {
    const query = q || question;
    if (!query.trim()) return;

    const userMsg = { role: "user", content: query };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setQuestion("");
    setLoading(true);

    try {
      const history = newMessages.slice(-6).map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await axios.post(`${API}/ask`, {
        question: query,
        history,
      });
      setMessages([
        ...newMessages,
        { role: "assistant", content: res.data.answer },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, #e0e7ff 0, #eef1f7 40%, #eef1f7 100%)",
        fontFamily: theme.font,
        padding: "24px 12px",
      }}
    >
      <div
        style={{
          maxWidth: 1160,
          margin: "0 auto",
          background: theme.colors.shellBg,
          borderRadius: theme.radius.shell,
          border: `1px solid ${theme.colors.border}`,
          boxShadow: theme.shadow.shell,
          overflow: "hidden",
        }}
      >
        {/* Header / Hero */}
        <div
          style={{
            padding: "18px 22px 14px",
            borderBottom: `1px solid ${theme.colors.border}`,
            display: "flex",
            alignItems: "stretch",
            gap: 18,
            background:
              "linear-gradient(120deg, rgba(99,102,241,0.07), rgba(56,189,248,0.04))",
          }}
        >
          <div style={{ display: "flex", flex: 1, gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                background: "white",
                borderRadius: 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.colors.primary,
                fontWeight: 700,
                fontSize: 18,
                boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
              }}
            >
              S
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 18,
                    color: theme.colors.textPrimary,
                  }}
                >
                  SupplyIQ
                </div>
                <span
                  style={{
                    fontSize: 11,
                    padding: "3px 9px",
                    borderRadius: theme.radius.chip,
                    background: "rgba(34,197,94,0.06)",
                    color: "#15803d",
                    border: "1px solid rgba(34,197,94,0.25)",
                    fontWeight: 500,
                  }}
                >
                  Live • Connected
                </span>
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: theme.colors.textSecondary,
                  marginTop: 2,
                }}
              >
                Ask questions about your inventory, orders, and suppliers in natural language.
              </div>
            </div>
          </div>

          {/* Small hero metric card (bento style) */}
          <div
            style={{
              minWidth: 240,
              maxWidth: 260,
              background: "#ffffff",
              borderRadius: theme.radius.smallCard,
              border: `1px solid ${theme.colors.border}`,
              padding: "10px 12px 10px",
              boxShadow: theme.shadow.soft,
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: theme.colors.textMuted,
                marginBottom: 4,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>Current dataset</span>
              <span
                style={{
                  fontSize: 10,
                  padding: "2px 7px",
                  borderRadius: theme.radius.chip,
                  background: theme.colors.subtleBg,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                {uploadData ? "Loaded" : "Not loaded"}
              </span>
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: theme.colors.textPrimary,
                marginBottom: 6,
              }}
            >
              {uploadData ? uploadData.filename : "Upload a CSV to begin"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 11,
                color: theme.colors.textSecondary,
              }}
            >
              <span>
                {uploadData ? `${uploadData.rows} rows` : "Awaiting data"}
              </span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  color: theme.colors.primaryDark,
                  fontWeight: 500,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: theme.colors.primarySoft,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                  }}
                >
                  ⬈
                </span>
                Ask a question
              </span>
            </div>
          </div>
        </div>

        {/* Main layout (bento-ish: upload + insights + preview vs chat) */}
        <div
          style={{
            padding: "18px 18px 20px",
            display: "grid",
            gridTemplateColumns: uploadData ? "340px 1fr" : "1fr",
            gap: 18,
          }}
        >
          {/* Left column */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Upload card */}
            <div
              style={{
                background: theme.colors.cardBg,
                borderRadius: theme.radius.card,
                border: `1px solid ${theme.colors.border}`,
                padding: 16,
                boxShadow: theme.shadow.card,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: theme.radius.chip,
                      background: theme.colors.primarySoft,
                      color: theme.colors.primary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                    }}
                  >
                    📂
                  </span>
                  Upload CSV
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: theme.colors.textMuted,
                  }}
                >
                  Inventory / orders
                </span>
              </div>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                style={{
                  border: `1.6px dashed ${
                    dragOver ? theme.colors.primary : theme.colors.border
                  }`,
                  borderRadius: 16,
                  padding: "18px 14px",
                  textAlign: "center",
                  background: dragOver
                    ? theme.colors.primarySoft
                    : theme.colors.subtleBg,
                  cursor: "pointer",
                  transition: "all 0.18s ease-out",
                  marginBottom: 10,
                }}
                onClick={() => document.getElementById("fileInput").click()}
              >
                <div
                  style={{
                    fontSize: 24,
                    marginBottom: 6,
                  }}
                >
                  📊
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: theme.colors.textSecondary,
                    marginBottom: 2,
                  }}
                >
                  {file ? file.name : "Drop CSV here or click to browse"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.colors.textMuted,
                  }}
                >
                  .csv only • up to ~10MB
                </div>
                <input
                  id="fileInput"
                  type="file"
                  accept=".csv"
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files[0])}
                />
              </div>

              <button
                onClick={() => handleUpload()}
                disabled={!file || uploading}
                style={{
                  width: "100%",
                  padding: "9px 0",
                  background:
                    !file || uploading
                      ? "#e5e7eb"
                      : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
                  color:
                    !file || uploading
                      ? theme.colors.textMuted
                      : "#ffffff",
                  border: "none",
                  borderRadius: theme.radius.button,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: !file || uploading ? "not-allowed" : "pointer",
                  boxShadow:
                    !file || uploading
                      ? "none"
                      : "0 10px 28px rgba(79,70,229,0.26)",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
              >
                {uploading ? "Analysing..." : "Upload & Analyse"}
              </button>
            </div>

            {/* Auto insights card */}
            {uploadData?.insights?.length > 0 && (
              <div
                style={{
                  background: theme.colors.cardBg,
                  borderRadius: theme.radius.card,
                  border: `1px solid ${theme.colors.border}`,
                  padding: 14,
                  boxShadow: theme.shadow.soft,
                  maxHeight: 260,
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: theme.colors.textPrimary,
                    }}
                  >
                    🔍 Auto Insights
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: theme.colors.textMuted,
                    }}
                  >
                    {uploadData.insights.length} insights
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: theme.colors.textSecondary,
                    marginBottom: 8,
                  }}
                >
                  Key risks and opportunities detected in your latest file.
                </div>
                <div
                  style={{
                    overflowY: "auto",
                    paddingRight: 4,
                  }}
                >
                  {uploadData.insights.map((ins, i) => (
                    <InsightCard key={i} insight={ins} />
                  ))}
                </div>
              </div>
            )}

            {/* Preview card */}
            {uploadData?.preview && (
              <div
                style={{
                  background: theme.colors.cardBg,
                  borderRadius: theme.radius.card,
                  border: `1px solid ${theme.colors.border}`,
                  padding: 14,
                  boxShadow: theme.shadow.soft,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <span>🗂 Data Preview</span>
                  <span
                    style={{
                      color: theme.colors.textMuted,
                      fontSize: 12,
                    }}
                  >
                    {showPreview ? "▲ Hide" : "▼ Show"}
                  </span>
                </div>
                {showPreview && (
                  <PreviewTable
                    columns={uploadData.columns}
                    rows={uploadData.preview}
                  />
                )}
              </div>
            )}
          </div>

          {/* Right column: Chat */}
          <div
            style={{
              background: theme.colors.cardBg,
              borderRadius: theme.radius.card,
              border: `1px solid ${theme.colors.border}`,
              boxShadow: theme.shadow.card,
              display: "flex",
              flexDirection: "column",
              minHeight: 560,
            }}
          >
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 18,
              }}
            >
              {!uploadData ? (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: 80,
                    color: theme.colors.textMuted,
                  }}
                >
                  <div style={{ fontSize: 42, marginBottom: 10 }}>🚚</div>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 16,
                      color: theme.colors.textPrimary,
                      marginBottom: 6,
                    }}
                  >
                    Upload a CSV to get started
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                    }}
                  >
                    SupplyIQ will analyse your data and surface actionable insights for you.
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      color: theme.colors.textSecondary,
                      marginBottom: 12,
                      fontWeight: 500,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: theme.radius.chip,
                        background: theme.colors.subtleBg,
                        border: `1px solid ${theme.colors.border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                      }}
                    >
                      💡
                    </span>
                    Try asking:
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8,
                    }}
                  >
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => handleAsk(q)}
                        style={{
                          padding: "7px 13px",
                          background: theme.colors.subtleBg,
                          border: `1px solid ${theme.colors.border}`,
                          borderRadius: theme.radius.chip,
                          fontSize: 12,
                          color: theme.colors.textPrimary,
                          cursor: "pointer",
                          transition:
                            "background 0.15s, border-color 0.15s, transform 0.08s",
                        }}
                        onMouseOver={(e) => {
                          e.target.style.background =
                            theme.colors.primarySoft;
                          e.target.style.borderColor =
                            theme.colors.primary;
                          e.target.style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={(e) => {
                          e.target.style.background =
                            theme.colors.subtleBg;
                          e.target.style.borderColor =
                            theme.colors.border;
                          e.target.style.transform = "translateY(0)";
                        }}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={i}
                      style={{
                        marginBottom: 16,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: isUser ? "flex-end" : "flex-start",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          color: theme.colors.textMuted,
                          marginBottom: 4,
                          fontWeight: 500,
                        }}
                      >
                        {isUser ? "You" : "SupplyIQ"}
                      </div>
                      <div
                        style={{
                          background: isUser
                            ? `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`
                            : theme.colors.subtleBg,
                          color: isUser ? "#ffffff" : theme.colors.textPrimary,
                          padding: "10px 13px",
                          borderRadius: isUser
                            ? "18px 18px 4px 18px"
                            : "18px 18px 18px 4px",
                          maxWidth: "85%",
                          fontSize: 13,
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.6,
                          border: `1px solid ${
                            isUser ? "rgba(129,140,248,0.9)" : theme.colors.border
                          }`,
                          boxShadow: isUser
                            ? "0 10px 24px rgba(79,70,229,0.22)"
                            : "none",
                        }}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })
              )}
              {loading && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: theme.colors.textMuted,
                    fontSize: 13,
                    marginTop: 4,
                  }}
                >
                  <div style={{ display: "flex", gap: 4 }}>
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: theme.colors.primary,
                          animation: `bounce 1s infinite ${i * 0.2}s`,
                        }}
                      />
                    ))}
                  </div>
                  SupplyIQ is thinking...
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input area */}
            <div
              style={{
                borderTop: `1px solid ${theme.colors.border}`,
                padding: "10px 14px",
                display: "flex",
                gap: 8,
                alignItems: "center",
                background: theme.colors.subtleBg,
              }}
            >
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  background: "#ffffff",
                  borderRadius: theme.radius.input,
                  border: `1px solid ${theme.colors.border}`,
                  padding: "4px 10px 4px 12px",
                }}
              >
                <span
                  style={{
                    fontSize: 15,
                    color: theme.colors.textMuted,
                  }}
                >
                  💬
                </span>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" && !loading && handleAsk()
                  }
                  placeholder={
                    uploadData
                      ? "Ask anything about your data..."
                      : "Upload a CSV first..."
                  }
                  disabled={!uploadData || loading}
                  style={{
                    flex: 1,
                    padding: "8px 6px",
                    border: "none",
                    borderRadius: 10,
                    fontSize: 13,
                    outline: "none",
                    background: "transparent",
                    color: theme.colors.textPrimary,
                  }}
                />
              </div>
              <button
                onClick={() => handleAsk()}
                disabled={loading || !uploadData || !question.trim()}
                style={{
                  padding: "9px 16px",
                  background:
                    loading || !uploadData || !question.trim()
                      ? "#e5e7eb"
                      : `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.primaryDark})`,
                  color:
                    loading || !uploadData || !question.trim()
                      ? theme.colors.textMuted
                      : "#ffffff",
                  border: "none",
                  borderRadius: theme.radius.button,
                  fontWeight: 600,
                  fontSize: 13,
                  cursor:
                    loading || !uploadData || !question.trim()
                      ? "not-allowed"
                      : "pointer",
                  whiteSpace: "nowrap",
                  boxShadow:
                    loading || !uploadData || !question.trim()
                      ? "none"
                      : "0 10px 25px rgba(79,70,229,0.24)",
                }}
              >
                {loading ? "…" : "Ask →"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(156,163,175,0.7);
          border-radius: 999px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(107,114,128,0.9);
        }
      `}</style>
    </div>
  );
}