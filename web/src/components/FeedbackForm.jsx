import { useState } from "react";

const CHANNEL_OPTIONS = [
  { label: "Blog", value: "blog" },
  { label: "Twitter", value: "twitter" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Hindi", value: "hindi" },
];

export default function FeedbackForm({ onSubmit, onSkip }) {
  const [rating, setRating] = useState(0);
  const [channel, setChannel] = useState("blog");
  const [comment, setComment] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    if (!rating) {
      return;
    }
    onSubmit(rating, comment, channel);
  }

  return (
    <form onSubmit={handleSubmit}>
      <h3>How was the output?</h3>
      <p>
        Your feedback trains the pipeline. The next similar brief will use your
        preferences.
      </p>

      <div aria-label="Rating selector">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            className={star <= rating ? "rating-highlight" : "rating-default"}
          >
            {star}
          </button>
        ))}
      </div>

      <div>
        <label htmlFor="feedback-channel">Channel</label>
        <select
          id="feedback-channel"
          value={channel}
          onChange={(event) => setChannel(event.target.value)}
        >
          {CHANNEL_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="feedback-comment">What could be improved?</label>
        <textarea
          id="feedback-comment"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
      </div>

      <div>
        <button type="submit" disabled={rating === 0}>
          Save feedback
        </button>
        <button type="button" onClick={onSkip}>
          Skip
        </button>
      </div>
    </form>
  );
}
