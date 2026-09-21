/**
 * @type {Map<string, import('web-push').PushSubscription>}
 */
const subscriptions = new Map();

const subscriptionService = {
  /**
   * @param {import('web-push').PushSubscription} subscription
   * @returns {string}
   */
  addSubscription(subscription) {
    const id = Date.now().toString();
    subscriptions.set(id, subscription);
    return id;
  },

  /**
   * @param {string} id
   * @returns {import('web-push').PushSubscription | undefined}
   */
  getSubscription(id) {
    return subscriptions.get(id);
  },

  /**
   * @returns {Map<string, import('web-push').PushSubscription>}
   */
  getAllSubscriptions() {
    return subscriptions;
  },

  /**
   * @param {string} id
   * @returns {boolean}
   */
  removeSubscription(id) {
    return subscriptions.delete(id);
  },

  /**
   * @returns {number}
   */
  getCount() {
    return subscriptions.size;
  },
};

module.exports = { subscriptionService };
