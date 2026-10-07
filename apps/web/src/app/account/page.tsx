'use client';

import { useCallback, useEffect, useState } from 'react';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

type Request = {
  _id: string;
  listingType: 'sale' | 'rent';
  status: string;
  paymentStatus?: 'unpaid' | 'reported' | 'paid' | 'pending' | 'checkout_pending';
  approvedAmount?: number;
  approvedCurrency?: string;
  message: string;
  property: { title: string; city: string; country: string; price: number; currency: string };
  agent: { _id: string; firstName: string; lastName: string; email: string; phone: string };
};

type Payment = {
  _id: string;
  amount: number;
  currency: string;
  status: 'reported' | 'paid' | 'rejected';
  method: 'bank_transfer' | 'cash';
  reference: string;
  note?: string;
};

type Account = { firstName: string; lastName: string; role: string };

export default function ClientAccount() {
  const [account, setAccount] = useState<Account | null>(null);
  const [requests, setRequests] = useState<Request[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [reportingRequest, setReportingRequest] = useState('');
  const [paymentRequest, setPaymentRequest] = useState<Request | null>(null);
  const [feedbackType, setFeedbackType] = useState('Feedback');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackAgentId, setFeedbackAgentId] = useState('');

  const load = useCallback(async () => {
    const [userResponse, requestResponse, paymentResponse] = await Promise.all([
      fetch(`${apiUrl}/auth/me`, { credentials: 'include' }),
      fetch(`${apiUrl}/requests`, { credentials: 'include' }),
      fetch(`${apiUrl}/payments`, { credentials: 'include' }),
    ]);
    if (!userResponse.ok || !requestResponse.ok || !paymentResponse.ok) {
      throw new Error('Please sign in to view your property requests.');
    }
    const user = (await userResponse.json()) as Account;
    if (user.role !== 'client') {
      window.location.href = '/agent';
      return;
    }
    setAccount(user);
    setRequests((await requestResponse.json()) as Request[]);
    setPayments((await paymentResponse.json()) as Payment[]);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Could not load your account.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [load]);

  async function signOut() {
    await fetch(`${apiUrl}/auth/signout`, { method: 'POST', credentials: 'include' });
    window.location.href = '/';
  }

  async function reportPayment(
    event: React.FormEvent<HTMLFormElement>,
    requestId: string,
  ) {
    event.preventDefault();
    setError('');
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    setReportingRequest(requestId);
    try {
      const response = await fetch(`${apiUrl}/payments/report/${requestId}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          method: form.get('method'),
          reference: form.get('reference'),
          note: form.get('note') || undefined,
        }),
      });
      const result = (await response.json()) as {
        message?: string | string[];
      };
      if (!response.ok) {
        throw new Error(
          Array.isArray(result.message)
            ? result.message.join(', ')
            : result.message ?? 'Could not report payment.',
        );
      }
      formElement.reset();
      setNotice('Payment reported. The agent will confirm it after checking receipt.');
      setReportingRequest('');
      setPaymentRequest(null);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not report payment.');
      setReportingRequest('');
    }
  }

  const feedbackAgents = Array.from(
    new Map(requests.map((request) => [request.agent._id, request.agent])).values(),
  );
  const feedbackAgent =
    feedbackAgents.find((agent) => agent._id === feedbackAgentId) ??
    feedbackAgents[0];
  const feedbackText = [
    `Haven Real-Estates ${feedbackType.toLowerCase()}`,
    account ? `From: ${account.firstName} ${account.lastName}` : '',
    feedbackMessage.trim(),
  ]
    .filter(Boolean)
    .join('\n\n');
  const whatsappNumber = feedbackAgent?.phone.replace(/\D/g, '');
  const whatsappUrl =
    whatsappNumber && whatsappNumber.length >= 8
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(feedbackText)}`
      : undefined;
  const emailUrl = feedbackAgent
    ? `mailto:${feedbackAgent.email}?subject=${encodeURIComponent(`Haven Real-Estates ${feedbackType.toLowerCase()}`)}&body=${encodeURIComponent(feedbackText)}`
    : undefined;

  function openFacebookFeedback() {
    const facebookWindow = window.open(
      'https://www.facebook.com/search/top?q=Haven%20Real-Estates',
      '_blank',
    );
    if (!facebookWindow) {
      setError('Your browser blocked the Facebook tab. Allow pop-ups and try again.');
      return;
    }
    facebookWindow.opener = null;
    void navigator.clipboard
      .writeText(feedbackText)
      .then(() =>
        setNotice('Feedback copied. Find the Haven Real-Estates page on Facebook and paste it into a message.'),
      )
      .catch(() =>
        setNotice('Facebook opened. Copy your feedback from the form and paste it into a message to Haven Real-Estates.'),
      );
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <a className="brand" href="/"><span className="brand-mark">h</span>haven<span className="brand-period">.</span></a>
        <div className="workspace-user">
          {account && <span>{account.firstName} {account.lastName}</span>}
          <button className="signout-link" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <section className="workspace-intro">
        <p className="eyebrow">YOUR HAVEN</p>
        <h1>Your next chapter, <em>in progress.</em></h1>
        <p>Keep track of the properties you’ve asked about and hear back from their agents.</p>
      </section>
      {loading ? <p className="workspace-loading">Loading your requests…</p> : error ? (
        <section className="workspace-panel"><p className="workspace-alert">{error}</p><a className="workspace-button" href="/">Explore properties</a></section>
      ) : (
        <section className="workspace-panel">
          <p className="eyebrow">YOUR REQUESTS</p>
          <h2>Places you’re considering <span className="workspace-count">{requests.length}</span></h2>
          {requests.length === 0 ? <p className="workspace-empty">You haven’t sent any requests yet. <a href="/#listings">Explore available properties →</a></p> : (
            <div className="managed-list">
              {requests.map((request) => (
                <article className="managed-request" key={request._id}>
                  <div>
                    <span className="property-kind-inline">{request.listingType} · {request.status}</span>
                    <h3>{request.property.title}</h3>
                    <p>{request.property.city}, {request.property.country} · {request.property.currency} {request.property.price.toLocaleString()}</p>
                    <p>{request.message}</p>
                    <p>Agent: {request.agent.firstName} {request.agent.lastName} · {request.agent.email} · {request.agent.phone}</p>
                    {request.status === 'approved' && (
                      <div className="payment-row">
                        <span className={`payment-status payment-${request.paymentStatus ?? 'unpaid'}`}>
                          {request.paymentStatus === 'paid'
                            ? 'Payment confirmed'
                            : request.paymentStatus === 'reported' ||
                                request.paymentStatus === 'pending' ||
                                request.paymentStatus === 'checkout_pending'
                              ? 'Payment reported — awaiting agent confirmation'
                              : 'Approved — arrange payment with your agent'}
                        </span>
                      </div>
                    )}
                    {request.status === 'approved' &&
                      (!request.paymentStatus ||
                        request.paymentStatus === 'unpaid' ||
                        request.paymentStatus === 'pending' ||
                        request.paymentStatus === 'checkout_pending') && (
                        <button
                          className="workspace-button payment-open-button"
                          type="button"
                          onClick={() => setPaymentRequest(request)}
                        >
                          Make payment
                        </button>
                      )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
      {payments.length > 0 && (
        <section className="workspace-panel">
          <p className="eyebrow">PAYMENT RECORDS</p>
          <h2>Payment activity</h2>
          <div className="managed-list">
            {payments.map((payment) => (
              <article className="managed-request" key={payment._id}>
                <div>
                  <span className={`payment-status payment-${payment.status}`}>
                    {payment.status === 'paid'
                      ? 'Confirmed by agent'
                      : payment.status === 'reported'
                        ? 'Awaiting agent confirmation'
                        : 'Not confirmed — please contact your agent'}
                  </span>
                  <p>
                    {payment.method === 'cash' ? 'Cash' : 'Bank transfer'} ·{' '}
                    {payment.currency} {payment.amount.toLocaleString()} · Ref:{' '}
                    {payment.reference}
                  </p>
                  {payment.note && <p>{payment.note}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
      <section className="workspace-panel">
        <p className="eyebrow">WE VALUE YOUR VOICE</p>
        <h2>Feedback, complaints & ideas</h2>
        <p className="feedback-intro">
          Tell us what is working, what needs attention, or how we can improve.
          Choose a channel to send your message.
        </p>
        <div className="feedback-form">
          <label>
            Message type
            <select
              value={feedbackType}
              onChange={(event) => setFeedbackType(event.target.value)}
            >
              <option>Feedback</option>
              <option>Complaint</option>
              <option>Suggestion</option>
              <option>Improvement idea</option>
            </select>
          </label>
          {feedbackAgents.length > 1 && (
            <label>
              Contact agent
              <select
                value={feedbackAgent?._id ?? ''}
                onChange={(event) => setFeedbackAgentId(event.target.value)}
              >
                {feedbackAgents.map((agent) => (
                  <option key={agent._id} value={agent._id}>
                    {agent.firstName} {agent.lastName}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="feedback-message-field">
            Your message
            <textarea
              value={feedbackMessage}
              onChange={(event) => setFeedbackMessage(event.target.value)}
              placeholder="Write your feedback, complaint, or idea…"
              maxLength={2000}
              required
            />
          </label>
        </div>
        {!feedbackAgent && (
          <p className="feedback-hint">
            WhatsApp and email are available after you send a property request
            and have an agent contact. Facebook search is available now.
          </p>
        )}
        <div className="feedback-actions">
          <a
            className="feedback-channel"
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!feedbackMessage.trim() || !whatsappUrl}
            onClick={(event) => {
              if (!feedbackMessage.trim() || !whatsappUrl) event.preventDefault();
            }}
          >
            WhatsApp{feedbackAgent ? ` · ${feedbackAgent.firstName}` : ''}
          </a>
          <a
            className="feedback-channel"
            href={emailUrl}
            aria-disabled={!feedbackMessage.trim() || !emailUrl}
            onClick={(event) => {
              if (!feedbackMessage.trim() || !emailUrl) event.preventDefault();
            }}
          >
            Email{feedbackAgent ? ` · ${feedbackAgent.firstName}` : ''}
          </a>
          <button
            className="feedback-channel"
            type="button"
            disabled={!feedbackMessage.trim()}
            onClick={openFacebookFeedback}
          >
            Facebook
          </button>
        </div>
      </section>
      {paymentRequest && (
        <div
          className="modal-backdrop payment-modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setPaymentRequest(null);
          }}
        >
          <section
            className="inquiry-modal payment-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close payment details"
              onClick={() => setPaymentRequest(null)}
            >
              ×
            </button>
            <p className="eyebrow">BANK TRANSFER</p>
            <h2 id="payment-modal-title">Pay for {paymentRequest.property.title}</h2>
            <p className="modal-intro">
              For bank transfer, send{' '}
              {paymentRequest.approvedCurrency ?? paymentRequest.property.currency}{' '}
              {(paymentRequest.approvedAmount ?? paymentRequest.property.price).toLocaleString()}{' '}
              to either Haven account below. For cash, pay the agent directly.
              The agent will confirm receipt before this property is marked sold
              or rented.
            </p>
            <div className="payment-account-list">
              <article className="payment-account">
                <span>ZENITH BANK</span>
                <p>Account name</p>
                <strong>Haven Real-Estates</strong>
                <p>Account number</p>
                <strong className="payment-account-number">4928692953</strong>
              </article>
              <article className="payment-account">
                <span>FIDELITY BANK</span>
                <p>Account name</p>
                <strong>Haven Real-Estates</strong>
                <p>Account number</p>
                <strong className="payment-account-number">6328572654</strong>
              </article>
            </div>
            <form
              className="offline-payment-form"
              onSubmit={(event) => reportPayment(event, paymentRequest._id)}
            >
              <label>
                Payment method
                <select name="method" defaultValue="bank_transfer">
                  <option value="bank_transfer">Bank transfer</option>
                  <option value="cash">Cash paid to agent</option>
                </select>
              </label>
              <label>
                Receipt or payment reference
                <input name="reference" required minLength={1} />
              </label>
              <label className="wide-field">
                Note for the agent (optional)
                <input name="note" />
              </label>
              <button
                className="workspace-button"
                type="submit"
                disabled={reportingRequest === paymentRequest._id}
              >
                {reportingRequest === paymentRequest._id
                  ? 'Reporting…'
                  : 'I have made the payment'}
              </button>
            </form>
          </section>
        </div>
      )}
      {notice && <div className="toast" role="status">{notice}</div>}
    </main>
  );
}
