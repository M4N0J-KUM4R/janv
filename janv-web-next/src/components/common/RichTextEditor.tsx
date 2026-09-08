'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  minHeight?: string;
  disabled?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter description',
  minHeight = '120px',
  disabled = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{
    open: boolean;
    mode: 'formula' | 'link' | 'image' | null;
    value: string;
  }>({
    open: false,
    mode: null,
    value: '',
  });

  // Saved range for restoring selection when tooltip is submitted
  const savedSelectionRef = useRef<Range | null>(null);

  // Synchronize internal DOM html with value prop without breaking active typing cursor position
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (!editorRef.current.innerHTML || value === '' || value !== editorRef.current.innerHTML) {
        editorRef.current.innerHTML = value || '';
      }
    }
  }, [value]);

  const saveSelection = () => {
    if (typeof window !== 'undefined') {
      const sel = window.getSelection();
      if (sel && sel.rangeCount > 0) {
        savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
      }
    }
  };

  const restoreSelection = () => {
    if (typeof window !== 'undefined' && savedSelectionRef.current) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  const format = (cmd: string, arg?: string) => {
    document.execCommand(cmd, false, arg);
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const openTooltip = (mode: 'formula' | 'link' | 'image') => {
    saveSelection();
    setTooltip({
      open: true,
      mode,
      value: '',
    });
  };

  const handleTooltipSave = () => {
    restoreSelection();
    if (editorRef.current) {
      editorRef.current.focus();
    }

    if (tooltip.mode === 'formula' && tooltip.value.trim()) {
      format(
        'insertHTML',
        `<span class="katex" style="font-family: KaTeX_Main, serif; font-style: italic; color: #2563eb; background: #eff6ff; padding: 2px 6px; border-radius: 4px;">$${tooltip.value.trim()}$</span>&nbsp;`
      );
    } else if (tooltip.mode === 'link' && tooltip.value.trim()) {
      let url = tooltip.value.trim();
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      format('createLink', url);
    } else if (tooltip.mode === 'image' && tooltip.value.trim()) {
      format('insertImage', tooltip.value.trim());
    }

    setTooltip({ open: false, mode: null, value: '' });
  };

  return (
    <div className="MuiFormControl-root MuiFormControl-fullWidth css-tzsjye" style={{ width: '100%', position: 'relative' }}>
      <div
        className="quill jss665 jss763"
        style={{
          border: '1px solid rgb(240, 240, 240)',
          borderRadius: '8px',
          width: '100%',
          position: 'relative',
          background: '#fff',
        }}
      >
        {/* Quill Toolbar matching exact SVGs */}
        <div
          className="ql-toolbar ql-snow"
          style={{
            border: 'none',
            borderBottom: '1px solid rgb(240, 240, 240)',
            padding: '6px 10px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            alignItems: 'center',
            background: disabled ? '#f5f5f5' : '#fcfcfc',
            position: 'relative',
            pointerEvents: disabled ? 'none' : 'auto',
            opacity: disabled ? 0.6 : 1,
          }}
        >
          <span className="ql-formats" style={{ display: 'inline-flex', gap: '2px' }}>
            <button
              type="button"
              className="ql-underline"
              title="Underline"
              onClick={() => format('underline')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <path className="ql-stroke" d="M5,3V9a4.012,4.012,0,0,0,4,4H9a4.012,4.012,0,0,0,4-4V3" fill="none" stroke="#444" strokeWidth="1.5"></path>
                <rect className="ql-fill" height="1" rx="0.5" ry="0.5" width="12" x="3" y="15" fill="#444"></rect>
              </svg>
            </button>
            <button
              type="button"
              className="ql-bold"
              title="Bold"
              onClick={() => format('bold')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <path className="ql-stroke" d="M5,4H9.5A2.5,2.5,0,0,1,12,6.5v0A2.5,2.5,0,0,1,9.5,9H5A0,0,0,0,1,5,9V4A0,0,0,0,1,5,4Z" fill="none" stroke="#444" strokeWidth="1.5"></path>
                <path className="ql-stroke" d="M5,9h5.5A2.5,2.5,0,0,1,13,11.5v0A2.5,2.5,0,0,1,10.5,14H5a0,0,0,0,1,0,0V9A0,0,0,0,1,5,9Z" fill="none" stroke="#444" strokeWidth="1.5"></path>
              </svg>
            </button>
            <button
              type="button"
              className="ql-italic"
              title="Italic"
              onClick={() => format('italic')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <line className="ql-stroke" x1="7" x2="13" y1="4" y2="4" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="5" x2="11" y1="14" y2="14" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="8" x2="10" y1="14" y2="4" stroke="#444" strokeWidth="1.5"></line>
              </svg>
            </button>
            <button
              type="button"
              className="ql-list"
              title="Bullet List"
              onClick={() => format('insertUnorderedList')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <line className="ql-stroke" x1="6" x2="15" y1="4" y2="4" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="6" x2="15" y1="9" y2="9" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="6" x2="15" y1="14" y2="14" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="3" x2="3" y1="4" y2="4" stroke="#444" strokeWidth="2"></line>
                <line className="ql-stroke" x1="3" x2="3" y1="9" y2="9" stroke="#444" strokeWidth="2"></line>
                <line className="ql-stroke" x1="3" x2="3" y1="14" y2="14" stroke="#444" strokeWidth="2"></line>
              </svg>
            </button>
            <button
              type="button"
              className="ql-list"
              title="Ordered List"
              onClick={() => format('insertOrderedList')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <line className="ql-stroke" x1="7" x2="15" y1="4" y2="4" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="7" x2="15" y1="9" y2="9" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke" x1="7" x2="15" y1="14" y2="14" stroke="#444" strokeWidth="1.5"></line>
                <line className="ql-stroke ql-thin" x1="2.5" x2="4.5" y1="5.5" y2="5.5" stroke="#444" strokeWidth="1"></line>
                <path className="ql-fill" d="M3.5,6A0.5,0.5,0,0,1,3,5.5V3.085l-0.276.138A0.5,0.5,0,0,1,2.053,3c-0.124-.247-0.023-0.324.224-0.447l1-.5A0.5,0.5,0,0,1,4,2.5v3A0.5,0.5,0,0,1,3.5,6Z" fill="#444"></path>
                <path className="ql-stroke ql-thin" d="M4.5,10.5h-2c0-.234,1.85-1.076,1.85-2.234A0.959,0.959,0,0,0,2.5,8.156" fill="none" stroke="#444" strokeWidth="1"></path>
                <path className="ql-stroke ql-thin" d="M2.5,14.846a0.959,0.959,0,0,0,1.85-.109A0.7,0.7,0,0,0,3.75,14a0.688,0.688,0,0,0,.6-0.736,0.959,0.959,0,0,0-1.85-.109" fill="none" stroke="#444" strokeWidth="1"></path>
              </svg>
            </button>
            <button
              type="button"
              className="ql-link"
              title="Link"
              onClick={() => openTooltip('link')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <line className="ql-stroke" x1="7" x2="11" y1="7" y2="11" stroke="#444" strokeWidth="1.5"></line>
                <path className="ql-even ql-stroke" d="M8.9,4.577a3.476,3.476,0,0,1,.36,4.679A3.476,3.476,0,0,1,4.577,8.9C3.185,7.5,2.035,6.4,4.217,4.217S7.5,3.185,8.9,4.577Z" fill="none" stroke="#444" strokeWidth="1.5"></path>
                <path className="ql-even ql-stroke" d="M13.423,9.1a3.476,3.476,0,0,0-4.679-.36,3.476,3.476,0,0,0,.36,4.679c1.392,1.392,2.5,2.542,4.679.36S14.815,10.5,13.423,9.1Z" fill="none" stroke="#444" strokeWidth="1.5"></path>
              </svg>
            </button>
            <button
              type="button"
              className="ql-image"
              title="Image"
              onClick={() => openTooltip('image')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <rect className="ql-stroke" height="10" width="12" x="3" y="4" fill="none" stroke="#444" strokeWidth="1.5"></rect>
                <circle className="ql-fill" cx="6" cy="7" r="1" fill="#444"></circle>
                <polyline className="ql-even ql-fill" points="5 12 5 11 7 9 8 10 11 7 13 9 13 12 5 12" fill="#444"></polyline>
              </svg>
            </button>
            <button
              type="button"
              className="ql-script"
              title="Superscript"
              onClick={() => format('superscript')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <path className="ql-fill" d="M15.5,7H13.861a4.015,4.015,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.922,1.922,0,0,0,12.021,3.7a0.5,0.5,0,1,0,.957.291,0.917,0.917,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.077-1.164,1.925-1.934,2.486A1.423,1.423,0,0,0,12,7.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,7Z" fill="#444"></path>
                <path className="ql-fill" d="M9.651,5.241a1,1,0,0,0-1.41.108L6,7.964,3.759,5.349a1,1,0,1,0-1.519,1.3L4.683,9.5,2.241,12.35a1,1,0,1,0,1.519,1.3L6,11.036,8.241,13.65a1,1,0,0,0,1.519-1.3L7.317,9.5,9.759,6.651A1,1,0,0,0,9.651,5.241Z" fill="#444"></path>
              </svg>
            </button>
            <button
              type="button"
              className="ql-script"
              title="Subscript"
              onClick={() => format('subscript')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <path className="ql-fill" d="M15.5,15H13.861a3.858,3.858,0,0,0,1.914-2.975,1.8,1.8,0,0,0-1.6-1.751A1.921,1.921,0,0,0,12.021,11.7a0.50013,0.50013,0,1,0,.957.291h0a0.914,0.914,0,0,1,1.053-.725,0.81,0.81,0,0,1,.744.762c0,1.076-1.16971,1.86982-1.93971,2.43082A1.45639,1.45639,0,0,0,12,15.5a0.5,0.5,0,0,0,.5.5h3A0.5,0.5,0,0,0,15.5,15Z" fill="#444"></path>
                <path className="ql-fill" d="M9.65,5.241a1,1,0,0,0-1.409.108L6,7.964,3.759,5.349A1,1,0,0,0,2.192,6.59178Q2.21541,6.6213,2.241,6.649L4.684,9.5,2.241,12.35A1,1,0,0,0,3.71,13.70722q0.02557-.02768.049-0.05722L6,11.036,8.241,13.65a1,1,0,1,0,1.567-1.24277Q9.78459,12.3777,9.759,12.35L7.316,9.5,9.759,6.651A1,1,0,0,0,9.65,5.241Z" fill="#444"></path>
              </svg>
            </button>
            <button
              type="button"
              className="ql-code-block"
              title="Code Block"
              onClick={() => format('formatBlock', '<pre>')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <polyline className="ql-even ql-stroke" points="5 7 3 9 5 11" fill="none" stroke="#444" strokeWidth="1.5"></polyline>
                <polyline className="ql-even ql-stroke" points="13 7 15 9 13 11" fill="none" stroke="#444" strokeWidth="1.5"></polyline>
                <line className="ql-stroke" x1="10" x2="8" y1="5" y2="13" stroke="#444" strokeWidth="1.5"></line>
              </svg>
            </button>
            <button
              type="button"
              className="ql-formula"
              title="Formula (LaTeX)"
              onClick={() => openTooltip('formula')}
              style={toolBtnStyle}
            >
              <svg viewBox="0 0 18 18" style={{ width: '16px', height: '16px' }}>
                <path className="ql-fill" d="M11.759,2.482a2.561,2.561,0,0,0-3.53.607A7.656,7.656,0,0,0,6.8,6.2C6.109,9.188,5.275,14.677,4.15,14.927a1.545,1.545,0,0,0-1.3-.933A0.922,0.922,0,0,0,2,15.036S1.954,16,4.119,16s3.091-2.691,3.7-5.553c0.177-.826.36-1.726,0.554-2.6L8.775,6.2c0.381-1.421.807-2.521,1.306-2.676a1.014,1.014,0,0,0,1.02.56A0.966,0.966,0,0,0,11.759,2.482Z" fill="#444"></path>
                <rect className="ql-fill" height="1.6" rx="0.8" ry="0.8" width="5" x="5.15" y="6.2" fill="#444"></rect>
                <path className="ql-fill" d="M13.663,12.027a1.662,1.662,0,0,1,.266-0.276q0.193,0.069.456,0.138a2.1,2.1,0,0,0,.535.069,1.075,1.075,0,0,0,.767-0.3,1.044,1.044,0,0,0,.314-0.8,0.84,0.84,0,0,0-.238-0.619,0.8,0.8,0,0,0-.594-0.239,1.154,1.154,0,0,0-.781.3,4.607,4.607,0,0,0-.781,1q-0.091.15-.218,0.346l-0.246.38c-0.068-.288-0.137-0.582-0.212-0.885-0.459-1.847-2.494-.984-2.941-0.8-0.482.2-.353,0.647-0.094,0.529a0.869,0.869,0,0,1,1.281.585c0.217,0.751.377,1.436,0.527,2.038a5.688,5.688,0,0,1-.362.467,2.69,2.69,0,0,1-.264.271q-0.221-.08-0.471-0.147a2.029,2.029,0,0,0-.522-0.066,1.079,1.079,0,0,0-.768.3A1.058,1.058,0,0,0,9,15.131a0.82,0.82,0,0,0,.832.852,1.134,1.134,0,0,0,.787-0.3,5.11,5.11,0,0,0,.776-0.993q0.141-.219.215-0.34c0.046-.076.122-0.194,0.223-0.346a2.786,2.786,0,0,0,.918,1.726,2.582,2.582,0,0,0,2.376-.185c0.317-.181.212-0.565,0-0.494A0.807,0.807,0,0,1,14.176,15a5.159,5.159,0,0,1-.913-2.446l0,0Q13.487,12.24,13.663,12.027Z" fill="#444"></path>
              </svg>
            </button>
          </span>

          {/* Quill Inline Tooltip Popup (.ql-tooltip) */}
          {tooltip.open && (
            <div
              className="ql-tooltip ql-editing"
              data-mode={tooltip.mode}
              style={{
                position: 'absolute',
                top: '40px',
                left: '10px',
                zIndex: 100,
                backgroundColor: '#ffffff',
                border: '1px solid #cccccc',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                borderRadius: '4px',
                padding: '6px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap',
                fontFamily: '"Public Sans", sans-serif',
                fontSize: '13px',
              }}
            >
              <span style={{ fontWeight: 500, color: '#444' }}>
                {tooltip.mode === 'formula'
                  ? 'Enter formula:'
                  : tooltip.mode === 'link'
                  ? 'Enter link:'
                  : 'Enter image URL:'}
              </span>
              <input
                type="text"
                autoFocus
                placeholder={
                  tooltip.mode === 'formula'
                    ? 'e=mc^2'
                    : tooltip.mode === 'link'
                    ? 'https://quilljs.com'
                    : 'https://example.com/image.png'
                }
                value={tooltip.value}
                onChange={(e) => setTooltip({ ...tooltip, value: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTooltipSave();
                  } else if (e.key === 'Escape') {
                    setTooltip({ open: false, mode: null, value: '' });
                  }
                }}
                style={{
                  border: '1px solid #ccc',
                  borderRadius: '3px',
                  padding: '4px 8px',
                  fontSize: '13px',
                  outline: 'none',
                  width: '200px',
                  fontFamily: '"Public Sans", sans-serif',
                }}
              />
              <button
                type="button"
                onClick={handleTooltipSave}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#017DF9',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '2px 4px',
                }}
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setTooltip({ open: false, mode: null, value: '' })}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#8B909A',
                  cursor: 'pointer',
                  fontSize: '13px',
                  padding: '2px 4px',
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Quill Editable Area */}
        <div className="ql-container ql-snow" style={{ border: 'none', background: disabled ? '#f9f9f9' : '#fff' }}>
          <div
            ref={editorRef}
            className="ql-editor ql-blank"
            contentEditable={!disabled}
            suppressContentEditableWarning
            onInput={handleInput}
            style={{
              minHeight,
              padding: '12px 16px',
              outline: 'none',
              fontSize: '14px',
              color: disabled ? '#727272' : '#1f2937',
              cursor: disabled ? 'not-allowed' : 'text',
              lineHeight: '1.6',
            }}
            data-placeholder={placeholder}
          />
        </div>
      </div>
    </div>
  );
}

const toolBtnStyle: React.CSSProperties = {
  width: '28px',
  height: '28px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '4px',
};
