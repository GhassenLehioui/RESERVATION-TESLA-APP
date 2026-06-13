import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';

export default function DateTimeSelector({ vin, center, onSelectDateTime, onBack }) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableHours, setAvailableHours] = useState([]);
  const [selectedHour, setSelectedHour] = useState(null);
  const [loading, setLoading] = useState(false);

  // Heures disponibles (simulation)
  const DEFAULT_HOURS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
  ];

  // Récupérer les heures disponibles pour une date donnée
  const fetchAvailableHours = async (date) => {
    setLoading(true);
    try {
      const response = await fetch(`https://reservation-tesla-app.onrender.com/api/available-hours`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centerId: center.id,
          date: date.toISOString().split('T')[0]
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableHours(data.hours || DEFAULT_HOURS);
      } else {
        // Utiliser les heures par défaut si l'API échoue
        setAvailableHours(DEFAULT_HOURS);
      }
    } catch (error) {
      console.error('Erreur lors de la récupération des heures:', error);
      setAvailableHours(DEFAULT_HOURS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      fetchAvailableHours(selectedDate);
      setSelectedHour(null);
    }
  }, [selectedDate]);

  // Générer les jours du mois
  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    setSelectedDate(null);
  };

  const handleSelectDate = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    // Vérifier que la date est dans le futur ou aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date >= today) {
      setSelectedDate(date);
    }
  };

  const handleSelectHour = (hour) => {
    setSelectedHour(hour);
  };

  const handleConfirm = async () => {
    if (selectedDate && selectedHour) {
      setLoading(true);
      try {
        // Envoyer la réservation au backend
        const response = await fetch(`https://reservation-tesla-app.onrender.com/api/reservation/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vin: vin,
            centerId: center.id,
            centerName: center.name,
            centerLat: center.lat,
            centerLng: center.lng,
            centerAddress: center.address,
            date: selectedDate.toISOString().split('T')[0],
            time: selectedHour,
            dateFormated: selectedDate.toLocaleDateString('fr-FR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long',
              year: 'numeric'
            })
          })
        });

        if (response.ok) {
          const data = await response.json();
          alert(`Réservation confirmée ! Un email de confirmation a été envoyé.`);
          onSelectDateTime({
            date: selectedDate,
            time: selectedHour,
            center: center
          });
        } else {
          const error = await response.json();
          alert(`Erreur : ${error.message || 'Impossible de confirmer la réservation'}`);
        }
      } catch (error) {
        console.error('Erreur lors de la confirmation:', error);
        alert('Erreur lors de l\'envoi de la réservation');
      } finally {
        setLoading(false);
      }
    }
  };

  const isDateDisabled = (day) => {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isDateSelected = (day) => {
    if (!selectedDate) return false;
    return selectedDate.getDate() === day &&
           selectedDate.getMonth() === currentMonth.getMonth() &&
           selectedDate.getFullYear() === currentMonth.getFullYear();
  };

  const monthName = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const daysArray = Array.from({ length: getDaysInMonth(currentMonth) }, (_, i) => i + 1);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '30px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={onBack}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          ← Retour
        </button>
        <h2 style={{ margin: 0, flex: 1, textAlign: 'center' }}>{center.name}</h2>
        <div style={{ width: '60px' }}></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Calendrier */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Sélectionnez une date</h3>
          
          <div style={{
            border: '1px solid var(--input-border)',
            borderRadius: '12px',
            padding: '15px',
            backgroundColor: 'var(--input-bg)'
          }}>
            {/* En-tête du calendrier */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <button
                onClick={handlePrevMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <ChevronLeft size={20} />
              </button>
              <span style={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                {monthName}
              </span>
              <button
                onClick={handleNextMonth}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  padding: '5px'
                }}
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Jours de la semaine */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '5px',
              marginBottom: '10px'
            }}>
              {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map(day => (
                <div
                  key={day}
                  style={{
                    textAlign: 'center',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    fontWeight: 'bold',
                    padding: '5px'
                  }}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Jours du mois */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: '5px'
            }}>
              {emptyDays.map(i => (
                <div key={`empty-${i}`} style={{ padding: '8px' }}></div>
              ))}
              {daysArray.map(day => {
                const disabled = isDateDisabled(day);
                const selected = isDateSelected(day);

                return (
                  <button
                    key={day}
                    onClick={() => handleSelectDate(day)}
                    disabled={disabled}
                    style={{
                      padding: '8px',
                      border: selected ? '2px solid #E31937' : '1px solid var(--input-border)',
                      borderRadius: '8px',
                      backgroundColor: selected ? 'rgba(227, 25, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                      color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
                      cursor: disabled ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: selected ? 'bold' : 'normal',
                      opacity: disabled ? 0.5 : 1,
                      transition: 'all 0.2s ease',
                      textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      if (!disabled && !selected) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!disabled && !selected) {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Sélection de l'heure */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: '15px', fontSize: '16px' }}>Sélectionnez une heure</h3>
          
          {selectedDate ? (
            <div>
              <div style={{
                backgroundColor: 'rgba(227, 25, 55, 0.1)',
                border: '1px solid rgba(227, 25, 55, 0.3)',
                borderRadius: '12px',
                padding: '12px',
                marginBottom: '15px',
                textAlign: 'center'
              }}>
                <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-secondary)' }}>Date sélectionnée :</p>
                <p style={{ margin: '5px 0 0 0', fontSize: '16px', fontWeight: 'bold' }}>
                  {selectedDate.toLocaleDateString('fr-FR', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div style={{
                border: '1px solid var(--input-border)',
                borderRadius: '12px',
                padding: '15px',
                backgroundColor: 'var(--input-bg)',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '10px'
                }}>
                  {loading ? (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Chargement des horaires...</p>
                    </div>
                  ) : availableHours.length > 0 ? (
                    availableHours.map(hour => (
                      <button
                        key={hour}
                        onClick={() => handleSelectHour(hour)}
                        style={{
                          padding: '12px',
                          border: selectedHour === hour ? '2px solid #E31937' : '1px solid var(--input-border)',
                          borderRadius: '8px',
                          backgroundColor: selectedHour === hour ? 'rgba(227, 25, 55, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: selectedHour === hour ? 'bold' : 'normal',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedHour !== hour) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedHour !== hour) {
                            e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)';
                          }
                        }}
                      >
                        <Clock size={16} />
                        {hour}
                      </button>
                    ))
                  ) : (
                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '20px' }}>
                      <p style={{ color: 'var(--text-secondary)' }}>Aucune heure disponible</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{
              border: '1px solid var(--input-border)',
              borderRadius: '12px',
              padding: '40px 20px',
              backgroundColor: 'var(--input-bg)',
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <Clock size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <p>Sélectionnez d'abord une date</p>
            </div>
          )}
        </div>
      </div>

      {/* Bouton de confirmation */}
      <button
        onClick={handleConfirm}
        disabled={!selectedDate || !selectedHour || loading}
        style={{
          width: '100%',
          padding: '14px',
          marginTop: '25px',
          borderRadius: '10px',
          border: 'none',
          backgroundColor: selectedDate && selectedHour && !loading ? '#E31937' : '#666',
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold',
          cursor: selectedDate && selectedHour && !loading ? 'pointer' : 'not-allowed',
          transition: 'all 0.3s ease',
          opacity: selectedDate && selectedHour && !loading ? 1 : 0.5
        }}
        onMouseEnter={(e) => {
          if (selectedDate && selectedHour && !loading) {
            e.currentTarget.style.backgroundColor = '#d41730';
            e.currentTarget.style.transform = 'scale(1.02)';
          }
        }}
        onMouseLeave={(e) => {
          if (selectedDate && selectedHour && !loading) {
            e.currentTarget.style.backgroundColor = '#E31937';
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
      >
        {loading ? 'Envoi en cours...' : 'Confirmer la réservation'}
      </button>
    </div>
  );
}
