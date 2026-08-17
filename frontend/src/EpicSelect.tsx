import React, { useState, useRef, useEffect } from 'react';
import { stringToColor } from './utils';

interface EpicSelectProps {
  value: string;
  onChange: (val: string) => void;
  options: string[];
}

export default function EpicSelect({ value, onChange, options }: EpicSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync prop to input when closed
  useEffect(() => {
    if (!isOpen) {
      setInputValue(value);
    }
  }, [value, isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(inputValue.toLowerCase())
  );

  const exactMatch = options.some(opt => opt.toLowerCase() === inputValue.toLowerCase());
  const showAddOption = inputValue.trim() !== '' && !exactMatch;

  const handleSelect = (val: string) => {
    onChange(val);
    setInputValue(val);
    setIsOpen(false);
  };

  return (
    <div className="assignee-select-container" ref={containerRef}>
      <input
        className="form-input w-full"
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Select or type an Epic..."
      />
      {isOpen && (
        <div className="assignee-dropdown">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt) => (
              <div
                key={opt}
                className="assignee-option"
                onClick={() => handleSelect(opt)}
              >
                <span 
                  className="epic-badge" 
                  style={{
                    borderColor: stringToColor(opt, 70, 60, 1),
                    color: stringToColor(opt, 70, 75, 1)
                  }}
                >
                  {opt}
                </span>
              </div>
            ))
          ) : (
            !showAddOption && <div className="assignee-option empty">No matching epics</div>
          )}
          
          {showAddOption && (
            <div
              className="assignee-option add-new"
              onClick={() => handleSelect(inputValue.trim())}
            >
              <div className="avatar add">+</div>
              Add "{inputValue.trim()}" as epic
            </div>
          )}
        </div>
      )}
    </div>
  );
}
