import { Users, Mail, TrendingUp, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useNewsletterAdmin } from '../../../hooks/useNewsletterAdmin';
import AdminPageHeader from '../../../components/AdminPageHeader';
import AdminPageLayout from '../../../components/AdminPageLayout';

export default function NewsletterAdmin() {
  const {
    data,
    loading,
    error,
    sendingNewsletter,
    sendResult,
    sendNewsletter,
    clearSendResult,
    refreshData,
  } = useNewsletterAdmin();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <AdminPageLayout>
        <div className="flex items-center justify-center min-h-96">
          <div className="loading loading-spinner loading-lg"></div>
        </div>
      </AdminPageLayout>
    );
  }

  if (error) {
    return (
      <AdminPageLayout>
        <div className="alert alert-error max-w-md mx-auto">
          <AlertCircle className="w-6 h-6" />
          <span>{error}</span>
          <button 
            onClick={() => refreshData()}
            className="btn btn-outline btn-sm"
          >
            Réessayer
          </button>
        </div>
      </AdminPageLayout>
    );
  }

  return (
    <AdminPageLayout>
      <AdminPageHeader
        title="Administration Newsletter"
        description="Gérez vos abonnés et envoyez des newsletters"
        icon={<Mail className="w-8 h-8 sm:w-10 sm:h-10" />}
      />

      {/* Message de résultat d'envoi */}
      {sendResult && (
        <div className={`alert ${sendResult.success ? 'alert-success' : 'alert-error'} mb-6`}>
          {sendResult.success ? (
            <CheckCircle className="w-6 h-6" />
          ) : (
            <AlertCircle className="w-6 h-6" />
          )}
          <span>{sendResult.message}</span>
          <button 
            onClick={clearSendResult}
            className="btn btn-ghost btn-sm"
          >
            ×
          </button>
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <Users className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-3xl font-bold">{data?.pagination?.total || 0}</div>
            <div className="text-sm text-base-content/70">Abonnés totaux</div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <TrendingUp className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-3xl font-bold">{data?.subscriptions?.filter(sub => {
              const createdDate = new Date(sub.createdAt);
              const weekAgo = new Date();
              weekAgo.setDate(weekAgo.getDate() - 7);
              return createdDate > weekAgo;
            }).length || 0}</div>
            <div className="text-sm text-base-content/70">Nouveaux cette semaine</div>
          </div>
        </div>

        <div className="card bg-base-100 shadow-lg">
          <div className="card-body text-center">
            <Calendar className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-3xl font-bold">{data?.subscriptions?.reduce((total, sub) => total + sub.emailsSent, 0) || 0}</div>
            <div className="text-sm text-base-content/70">Emails envoyés au total</div>
          </div>
        </div>
      </div>

      {/* Action d'envoi de newsletter */}
      <div className="card bg-base-100 shadow-lg mb-8">
        <div className="card-body">
          <h3 className="card-title flex items-center gap-2">
            <Mail className="w-6 h-6" />
            Envoyer une newsletter
          </h3>
          <p className="text-base-content/70 mb-4">
            Envoyez une newsletter aux {data?.pagination?.total || 0} abonnés avec les dernières opportunités crypto.
          </p>
          
          <button
            onClick={sendNewsletter}
            disabled={sendingNewsletter}
            className={`btn btn-primary ${sendingNewsletter ? 'loading' : ''}`}
          >
            {sendingNewsletter ? 'Envoi en cours...' : 'Envoyer Newsletter'}
          </button>
        </div>
      </div>

      {/* Liste des abonnés */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body">
          <h3 className="card-title">Abonnés récents</h3>
          
          {data?.subscriptions && data.subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Date d'inscription</th>
                    <th>Emails envoyés</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {data.subscriptions.slice(0, 10).map((subscription) => (
                    <tr key={subscription.id}>
                      <td>{subscription.email}</td>
                      <td>{formatDate(subscription.createdAt)}</td>
                      <td>{subscription.emailsSent}</td>
                      <td>
                        <div className={`badge ${subscription.isActive ? 'badge-success' : 'badge-error'}`}>
                          {subscription.isActive ? 'Actif' : 'Inactif'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
              <p className="text-base-content/70">Aucun abonné pour le moment</p>
            </div>
          )}
        </div>
      </div>
    </AdminPageLayout>
  );
}
