'use client';

import { useState } from 'react';
import { Listing, MEET_SPOTS_PROVO } from '@upseller/shared';
import { apiClient } from '@/lib/api';

interface ListingFormProps {
  onListingCreated: () => void;
}

export default function ListingForm({ onListingCreated }: ListingFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    listPrice: '',
    minPrice: '',
    locationCity: 'Provo',
    meetSpots: [] as string[],
    availability: '',
    paymentMethods: [] as ('venmo' | 'cash')[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const listing: Omit<Listing, 'id'> = {
        title: formData.title,
        listPrice: parseFloat(formData.listPrice),
        minPrice: parseFloat(formData.minPrice),
        locationCity: formData.locationCity,
        meetSpots: formData.meetSpots,
        availability: formData.availability.split('\n').filter(Boolean),
        paymentMethods: formData.paymentMethods,
      };

      const response = await apiClient.createListing(listing);
      
      if (response.data?.ok) {
        // Reset form
        setFormData({
          title: '',
          listPrice: '',
          minPrice: '',
          locationCity: 'Provo',
          meetSpots: [],
          availability: '',
          paymentMethods: [],
        });
        setIsOpen(false);
        onListingCreated();
      }
    } catch (error) {
      console.error('Failed to create listing:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMeetSpotChange = (spot: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      meetSpots: checked 
        ? [...prev.meetSpots, spot]
        : prev.meetSpots.filter(s => s !== spot)
    }));
  };

  const handlePaymentMethodChange = (method: 'venmo' | 'cash', checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      paymentMethods: checked 
        ? [...prev.paymentMethods, method]
        : prev.paymentMethods.filter(m => m !== method)
    }));
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
      >
        + Add Listing
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Add New Listing</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Title
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., iPhone 13 Pro Max"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  List Price ($)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.listPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, listPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min Price ($)
                </label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  value={formData.minPrice}
                  onChange={(e) => setFormData(prev => ({ ...prev, minPrice: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Meet Spots
              </label>
              <div className="space-y-2">
                {MEET_SPOTS_PROVO.map((spot) => (
                  <label key={spot} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.meetSpots.includes(spot)}
                      onChange={(e) => handleMeetSpotChange(spot, e.target.checked)}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{spot}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Availability (one per line)
              </label>
              <textarea
                value={formData.availability}
                onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Monday 6-8 PM&#10;Tuesday 7-9 PM"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Methods
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.paymentMethods.includes('cash')}
                    onChange={(e) => handlePaymentMethodChange('cash', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Cash</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.paymentMethods.includes('venmo')}
                    onChange={(e) => handlePaymentMethodChange('venmo', e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Venmo</span>
                </label>
              </div>
            </div>

            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Creating...' : 'Create Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
