import { useRef, useState } from 'react';
import { Star } from 'lucide-react';
import { translateText, useUILanguage } from '../../i18n/display';
import { backendError } from '../../backend/firebase';
import type { Product } from './model';
import { summarizeReviews, reviewMetrics, type ReviewSummary } from './model';
import { submitProductReview } from './reviewRepository';
import './product-reviews.css';

export function RatingBadge({ product }: { product: Product }) {
  useUILanguage();
  const { ratingAverage, reviewsCount } = reviewMetrics(product);
  return <div className="pr-rating" role="status" aria-live="polite"><Star size={14} fill="currentColor" aria-hidden="true"/><b>{reviewsCount ? ratingAverage.toFixed(1) : translateText('New')}</b><span>{reviewsCount ? `(${reviewsCount} ${translateText(reviewsCount === 1 ? 'review' : 'reviews')})` : translateText('(No reviews yet)')}</span></div>;
}

export function ProductReviews({ product, tenantId, onSubmitted }: { product: Product; tenantId: string; onSubmitted: (summary: ReviewSummary) => void }) {
  useUILanguage();
  const [rating, setRating] = useState(0), [hover, setHover] = useState(0);
  const [author, setAuthor] = useState(''), [comment, setComment] = useState('');
  const [pending, setPending] = useState(false), [error, setError] = useState(''), [success, setSuccess] = useState(false);
  const attempt = useRef<{ payload: string; id: string } | null>(null), submitting = useRef(false);
  const reviews = summarizeReviews(product.reviews).reviews;
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(''); setSuccess(false);
    if (!rating || !author.trim() || !comment.trim()) { setError(translateText('Choose a star rating and enter your name and review.')); return; }
    if (!product.id || !tenantId) { setError(translateText('Save this product before submitting a review.')); return; }
    const payload = JSON.stringify({ rating, author: author.trim(), comment: comment.trim() });
    if (attempt.current?.payload !== payload) attempt.current = { payload, id: crypto.randomUUID() };
    submitting.current = true; setPending(true);
    try {
      const summary = await submitProductReview(tenantId, product.id, { id: attempt.current.id, rating, author: author.trim(), comment: comment.trim() });
      onSubmitted(summary); setSuccess(true); setRating(0); setHover(0); setAuthor(''); setComment(''); attempt.current = null;
    } catch (cause) { setError(backendError(cause)); }
    finally { submitting.current = false; setPending(false); }
  }
  return <section className="pr-section lp-container" aria-label={translateText('Customer reviews')}>
    <header><div><span className="lp-section-label">{translateText('CUSTOMER EXPERIENCE')}</span><h2>{translateText('Ratings & reviews')}</h2></div><RatingBadge product={product}/></header>
    {(product.reviewsCount || 0) > reviews.length && <p>{translateText('Showing the latest')} {reviews.length} {translateText('reviews')}</p>}<div className="pr-grid"><div className="pr-list">{reviews.length ? [...reviews].reverse().map(review => <article key={review.id} className="pr-review"><header><b>{review.author}</b><span className="pr-stars" aria-label={`${review.rating} ${translateText('out of 5 stars')}`}>{'★'.repeat(review.rating)}<span>{'☆'.repeat(5 - review.rating)}</span></span></header><p>{review.comment}</p><time dateTime={review.createdAt}>{Number.isFinite(Date.parse(review.createdAt)) ? new Date(review.createdAt).toLocaleDateString() : ''}</time></article>) : <div className="pr-empty"><Star size={24}/><h3>{translateText('Be the first to leave a review')}</h3><p>{translateText('Share your experience to help others choose.')}</p></div>}</div>
    <form className="pr-form" onSubmit={submit}><h3>{translateText('Share your experience')}</h3><fieldset disabled={pending || !product.id}><legend>{translateText('Your rating')}</legend><div className="pr-star-input" onMouseLeave={() => setHover(0)}>{[1, 2, 3, 4, 5].map(value => <label key={value} onMouseEnter={() => setHover(value)}><input type="radio" name={`rating-${product.id}`} value={value} checked={rating === value} onChange={() => { setRating(value); setSuccess(false); }} aria-label={`${value} ${translateText(value === 1 ? 'star' : 'stars')}`}/><Star size={28} aria-hidden="true" fill={value <= (hover || rating) ? 'currentColor' : 'none'}/></label>)}</div><label>{translateText('Your name')}<input aria-label={translateText('Your name')} required maxLength={80} autoComplete="name" value={author} onChange={event => setAuthor(event.target.value)}/></label><label>{translateText('Your review')}<textarea aria-label={translateText('Your review')} required maxLength={1000} rows={4} value={comment} onChange={event => setComment(event.target.value)}/></label></fieldset>
    {error && <p className="pr-error" role="alert">{error}</p>}{success && <p className="pr-success" role="status">{translateText('Thank you! Your review has been submitted.')}</p>}
    {!product.id && <p>{translateText('Save this product before submitting a review.')}</p>}<button type="submit" disabled={pending || !product.id} className="cw-button primary">{translateText(pending ? 'Submitting…' : 'Submit review')}</button></form></div>
  </section>;
}
