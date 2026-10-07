'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';

const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

type Property = {
  _id: string;
  title: string;
  description: string;
  type: 'house' | 'land' | 'apartment';
  listingType: 'sale' | 'rent';
  price: number;
  currency: string;
  address: string;
  city: string;
  country: string;
  status: 'available' | 'reserved' | 'sold' | 'rented';
  updatedAt: string;
  agent?: { _id: string };
};

type PropertyRequest = {
  _id: string;
  listingType: 'sale' | 'rent';
  status: 'new' | 'contacted' | 'approved' | 'declined';
  paymentStatus?: 'unpaid' | 'reported' | 'paid' | 'pending' | 'checkout_pending';
  phone: string;
  message: string;
  property: { title: string; city: string; price: number; currency: string };
  client: { firstName: string; lastName: string; email: string };
};

type Payment = {
  _id: string;
  amount: number;
  currency: string;
  status: 'reported' | 'confirming' | 'paid' | 'rejected';
  method: 'bank_transfer' | 'cash';
  reference: string;
  note?: string;
  property: { title: string; city: string; country: string };
  client: { firstName: string; lastName: string; email: string };
};

type Account = {
  firstName: string;
  lastName: string;
  role: 'agent' | 'admin' | 'client';
  agent?: { _id: string };
};
type Agent = { _id: string; firstName: string; lastName: string; email: string };

async function api(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const result = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    const message = (result as { message?: string | string[] } | null)?.message;
    throw new Error(
      Array.isArray(message)
        ? message.join(', ')
        : message ?? `Request failed (${response.status}).`,
    );
  }
  return result as unknown;
}

export default function AgentWorkspace() {
  const [account, setAccount] = useState<Account | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [requests, setRequests] = useState<PropertyRequest[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadWorkspace = useCallback(async () => {
    const [user, propertyList, requestList, paymentList] = await Promise.all([
      api('/auth/me') as Promise<Account>,
      api('/properties') as Promise<Property[]>,
      api('/requests') as Promise<PropertyRequest[]>,
      api('/payments') as Promise<Payment[]>,
    ]);
    if (user.role !== 'agent' && user.role !== 'admin') {
      throw new Error('This workspace is only available to agents.');
    }
    setAccount(user);
    setProperties(propertyList);
    setRequests(requestList);
    setPayments(paymentList);
    if (user.role === 'admin') {
      setAgents((await api('/agents')) as Agent[]);
    }
  }, []);

  useEffect(() => {
    let active = true;
    loadWorkspace()
      .catch((reason: unknown) => {
        if (active) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Could not load your workspace.',
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [loadWorkspace]);

  async function createListing(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    const payload = {
      title: form.get('title'),
      description: form.get('description'),
      type: form.get('type'),
      listingType: form.get('listingType'),
      price: Number(form.get('price')),
      currency: form.get('currency'),
      address: form.get('address'),
      city: form.get('city'),
      country: form.get('country'),
      bedrooms: form.get('bedrooms')
        ? Number(form.get('bedrooms'))
        : undefined,
      bathrooms: form.get('bathrooms')
        ? Number(form.get('bathrooms'))
        : undefined,
      area: form.get('area') ? Number(form.get('area')) : undefined,
      areaUnit: form.get('areaUnit') || undefined,
      ...(account?.role === 'admin'
        ? { agent: form.get('agent') }
        : {}),
    };
    try {
      await api('/properties', { method: 'POST', body: JSON.stringify(payload) });
      formElement.reset();
      await loadWorkspace();
      setNotice('Property listing created.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not add listing.');
    }
  }

  async function updateListing(
    event: FormEvent<HTMLFormElement>,
    propertyId: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setError('');
    try {
      await api(`/properties/${propertyId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          title: form.get('title'),
          description: form.get('description'),
          price: Number(form.get('price')),
          status: form.get('status'),
        }),
      });
      await loadWorkspace();
      setNotice('Listing updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update listing.');
    }
  }

  async function deleteListing(propertyId: string) {
    if (!window.confirm('Delete this property listing?')) return;
    setError('');
    try {
      await api(`/properties/${propertyId}`, { method: 'DELETE' });
      await loadWorkspace();
      setNotice('Listing deleted.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not delete listing.');
    }
  }

  async function updateRequest(requestId: string, status: PropertyRequest['status']) {
    setError('');
    try {
      await api(`/requests/${requestId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadWorkspace();
      setNotice(
        status === 'approved'
          ? 'Request approved; the listing is now reserved for payment.'
          : 'Request updated.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update request.');
    }
  }

  async function reviewPayment(paymentId: string, status: 'paid' | 'rejected') {
    setError('');
    try {
      await api(`/payments/${paymentId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      await loadWorkspace();
      setNotice(
        status === 'paid'
          ? 'Payment confirmed; the property is now marked occupied.'
          : 'Payment report rejected; the client can report a corrected payment.',
      );
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not review payment.');
    }
  }

  async function createAgentAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const formElement = event.currentTarget;
    setError('');
    try {
      await api('/auth/agent-accounts', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      formElement.reset();
      setNotice('Agent account created; they can sign in with that email.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create agent.');
    }
  }

  async function signOut() {
    await api('/auth/signout', { method: 'POST' });
    window.location.href = '/';
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <a className="brand" href="/"><span className="brand-mark">h</span>haven<span className="brand-period">.</span></a>
        <div className="workspace-user">
          {account && <span>{account.firstName} {account.lastName} · {account.role}</span>}
          <button className="signout-link" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <section className="workspace-intro">
        <p className="eyebrow">HAVEN WORKSPACE</p>
        <h1>Good to have you <em>here.</em></h1>
        <p>Manage your listings and follow up with people looking for a place to call home.</p>
      </section>

      {error && <p className="workspace-alert" role="alert">{error}</p>}
      {notice && <p className="workspace-notice" role="status">{notice}</p>}
      {loading ? (
        <p className="workspace-loading">Loading workspace…</p>
      ) : !account || (account.role !== 'agent' && account.role !== 'admin') ? (
        <section className="workspace-panel"><p>Sign in with an agent account to continue.</p><a className="workspace-button" href="/">Back to Haven</a></section>
      ) : (
        <>
          {account.role === 'admin' && (
            <section className="workspace-panel">
              <p className="eyebrow">TEAM ACCESS</p>
              <h2>Create an agent account</h2>
              <form className="agent-account-form" onSubmit={createAgentAccount}>
                <label>First name<input name="firstName" required /></label>
                <label>Last name<input name="lastName" required /></label>
                <label>Email<input name="email" type="email" required /></label>
                <label>Phone<input name="phone" required /></label>
                <label>Agency<input name="agency" required /></label>
                <label>Temporary password<input name="password" type="password" minLength={8} required /></label>
                <button className="workspace-button" type="submit">Create agent access</button>
              </form>
            </section>
          )}
          <section className="workspace-panel">
            <p className="eyebrow">ADD A PLACE</p>
            <h2>Create a property listing</h2>
            <form className="listing-form" onSubmit={createListing}>
              <label>Listing title<input name="title" required /></label>
              <label>Property type<select name="type"><option value="house">House</option><option value="apartment">Apartment</option><option value="land">Land</option></select></label>
              <label>Offer type<select name="listingType"><option value="sale">For sale</option><option value="rent">For rent</option></select></label>
              <label>Price<input name="price" type="number" min="0" required /></label>
              <label>Currency<input name="currency" defaultValue="USD" required /></label>
              <label>Address<input name="address" required /></label>
              <label>City<input name="city" required /></label>
              <label>Country<input name="country" required /></label>
              <label>Bedrooms<input name="bedrooms" type="number" min="0" /></label>
              <label>Bathrooms<input name="bathrooms" type="number" min="0" /></label>
              <label>Area<input name="area" type="number" min="0" /></label>
              <label>Area unit<input name="areaUnit" defaultValue="sqm" /></label>
              {account.role === 'admin' && (
                <label>Assigned agent<select name="agent" required defaultValue=""><option value="" disabled>Select an agent</option>{agents.map((agent) => <option key={agent._id} value={agent._id}>{agent.firstName} {agent.lastName} · {agent.email}</option>)}</select></label>
              )}
              <label className="wide-field">Description<textarea name="description" required /></label>
              <button className="workspace-button" type="submit">Add listing</button>
            </form>
          </section>

          <section className="workspace-panel">
            <p className="eyebrow">YOUR PORTFOLIO</p>
            <h2>Property listings <span className="workspace-count">{properties.length}</span></h2>
            {properties.length === 0 ? <p className="workspace-empty">No listings yet. Add your first place above.</p> : (
              <div className="managed-list">
                {properties.map((property) => (
                  <form className="managed-property" key={`${property._id}-${property.updatedAt}`} onSubmit={(event) => updateListing(event, property._id)}>
                    <div className="managed-property-heading">
                      <span className="property-kind-inline">{property.type} · {property.listingType}</span>
                      <button className="delete-listing" type="button" onClick={() => deleteListing(property._id)}>Delete listing</button>
                    </div>
                    <div className="managed-fields">
                      <label>Title<input name="title" defaultValue={property.title} required /></label>
                      <label>Price<input name="price" type="number" min="0" defaultValue={property.price} required /></label>
                      <label>Status<select name="status" defaultValue={property.status} disabled={property.status === 'reserved'}>{property.status === 'reserved' ? <option value="reserved">Reserved for approved request</option> : <><option value="available">Available</option><option value="reserved">Reserved</option><option value="sold">Sold / occupied</option><option value="rented">Rented / occupied</option></>}</select></label>
                      <label className="wide-field">Description<textarea name="description" defaultValue={property.description} required /></label>
                    </div>
                    <div className="managed-property-footer">
                      <span>{property.city}, {property.country} · {property.currency}</span>
                      <button className="workspace-button small-button" type="submit">Save changes</button>
                    </div>
                  </form>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-panel">
            <p className="eyebrow">OFFLINE PAYMENT REVIEW</p>
            <h2>Reported payments <span className="workspace-count">{payments.filter((payment) => payment.status === 'reported').length}</span></h2>
            {payments.filter((payment) => payment.status === 'reported').length === 0 ? (
              <p className="workspace-empty">No client payments are waiting for confirmation.</p>
            ) : (
              <div className="managed-list">
                {payments.filter((payment) => payment.status === 'reported').map((payment) => (
                  <article className="managed-request" key={payment._id}>
                    <div>
                      <span className="property-kind-inline">Payment reported</span>
                      <h3>{payment.property.title}</h3>
                      <p>{payment.property.city}, {payment.property.country} · {payment.currency} {payment.amount.toLocaleString()}</p>
                      <p>{payment.client.firstName} {payment.client.lastName} · {payment.client.email}</p>
                      <p>{payment.method === 'cash' ? 'Cash' : 'Bank transfer'} · Reference: {payment.reference}</p>
                      {payment.note && <p>Client note: {payment.note}</p>}
                    </div>
                    <div className="request-actions">
                      <button className="request-action approve-action" type="button" onClick={() => reviewPayment(payment._id, 'paid')}>Confirm receipt & mark occupied</button>
                      <button className="request-action decline-action" type="button" onClick={() => reviewPayment(payment._id, 'rejected')}>Reject report</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="workspace-panel">
            <p className="eyebrow">CLIENT FOLLOW-UP</p>
            <h2>Purchase & rental requests <span className="workspace-count">{requests.length}</span></h2>
            {requests.length === 0 ? <p className="workspace-empty">No client requests yet.</p> : (
              <div className="managed-list">
                {requests.map((request) => (
                  <article className="managed-request" key={request._id}>
                    <div>
                      <span className="property-kind-inline">{request.listingType} · {request.status}</span>
                      <h3>{request.property.title}</h3>
                      <p>{request.client.firstName} {request.client.lastName} · {request.client.email} · {request.phone}</p>
                      <p>{request.message}</p>
                    </div>
                    {request.status === 'new' || request.status === 'contacted' ? (
                      <div className="request-actions">
                        {request.status === 'new' && <button className="request-action" type="button" onClick={() => updateRequest(request._id, 'contacted')}>Mark contacted</button>}
                        <button className="request-action approve-action" type="button" onClick={() => updateRequest(request._id, 'approved')}>Approve & reserve</button>
                        <button className="request-action decline-action" type="button" onClick={() => updateRequest(request._id, 'declined')}>Decline</button>
                      </div>
                    ) : (
                      <div className="request-actions">
                        <span className="request-resolved">{request.status}{request.status === 'approved' ? ` · ${request.paymentStatus ?? 'unpaid'}` : ''}</span>
                        {request.status === 'approved' && (!request.paymentStatus || request.paymentStatus === 'unpaid') && (
                          <button className="request-action decline-action" type="button" onClick={() => updateRequest(request._id, 'declined')}>Decline & release reservation</button>
                        )}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
