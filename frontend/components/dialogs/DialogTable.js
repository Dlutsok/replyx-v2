import { FiMessageCircle, FiSmartphone, FiGlobe } from 'react-icons/fi';
import styles from '../../styles/pages/Dialogs.module.css';
import { 
  getInitials, 
  getUserDisplayName, 
  getUserSubtitle, 
  getChannelName, 
  getChannelType,
  toLocal 
} from '../../utils/dialogHelpers';

const AssistantIcon = ({ botType }) => {
  switch(botType) {
    case 'telegram': return <FiMessageCircle className={styles.botIcon} />;
    case 'website': return <FiGlobe className={styles.botIcon} />;
    case 'whatsapp': return <FiSmartphone className={styles.botIcon} />;
    default: return <FiMessageCircle className={styles.botIcon} />;
  }
};

const DialogTable = ({ dialogs, bots, onDialogOpen }) => {
  return (
    <>
      {/* Десктоп версия с таблицей */}
      <div className={styles.tableWrapper}>
        <table className={styles.dialogsTable}>
          <thead>
            <tr>
              <th>Пользователь</th>
              <th>Канал</th>
              <th>Ассистент</th>
              <th>Последнее сообщение</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {dialogs.map((dialog, index) => (
              <tr
                key={dialog.id}
                className={styles.dialogRow}
                onClick={() => onDialogOpen(dialog)}
                role="button"
                tabIndex={0}
                aria-label={`Открыть диалог с ${getUserDisplayName(dialog)}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onDialogOpen(dialog);
                  }
                }}
              >
                  <td>
                    <div className={styles.userCell}>
                      <div className={styles.avatar}>
                        {getInitials(dialog)}
                      </div>
                      <div className={styles.userInfo}>
                        <div className={styles.userName}>
                          {getUserDisplayName(dialog)}
                          {/* Status indicators */}
                          {dialog.is_taken_over === 1 && (
                            <span className={`${styles.statusBadge} ${styles.takenOver}`}>
                              Перехвачен
                            </span>
                          )}
                          {dialog.is_taken_over !== 1 && dialog.auto_response && (
                            <span className={`${styles.statusBadge} ${styles.active}`}>
                              Активен
                            </span>
                          )}
                        </div>
                        <div className={styles.userSub}>
                          {getUserSubtitle(dialog)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className={styles.botCell}>
                      <AssistantIcon botType={getChannelType(dialog)} />
                      <span>{getChannelName(dialog)}</span>
                    </div>
                  </td>
                  <td>
                    <div className={styles.botCell}>
                      <AssistantIcon botType={(() => {
                        const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
                        return bot ? bot.platform : 'unknown';
                      })()} />
                      <span>
                        {(() => {
                          const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
                          return bot ? bot.assistant_name : 'Неизвестный ассистент';
                        })()}
                      </span>
                    </div>
                  </td>
                  <td className={styles.timeCell}>
                    <div className={styles.timeInfo}>
                      <span className={styles.time}>{toLocal(dialog.last_message_at)}</span>
                      <span className={styles.date}>
                        {new Date(dialog.last_message_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td>
                    <button
                      className={styles.openBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDialogOpen(dialog);
                      }}
                      aria-label={`Открыть диалог с ${getUserDisplayName(dialog)}`}
                    >
                      Открыть
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Мобильная версия с карточками */}
      <div className={styles.dialogCardsContainer}>
        {dialogs.map((dialog, index) => (
          <div
            key={dialog.id}
            className={styles.dialogCard}
            onClick={() => onDialogOpen(dialog)}
            role="button"
            tabIndex={0}
            aria-label={`Открыть диалог с ${getUserDisplayName(dialog)}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onDialogOpen(dialog);
              }
            }}
          >
              {/* Верхняя часть - пользователь и статус */}
              <div className={styles.dialogCardHeader}>
                <div className={styles.dialogCardUser}>
                  <div className={styles.dialogCardAvatar}>
                    {getInitials(dialog)}
                  </div>
                  <div className={styles.dialogCardUserInfo}>
                    <div className={styles.dialogCardUserName}>
                      {getUserDisplayName(dialog)}
                    </div>
                    <div className={styles.dialogCardUserSub}>
                      {getUserSubtitle(dialog)}
                    </div>
                  </div>
                </div>
                <div className={styles.dialogCardStatus}>
                  {dialog.is_taken_over === 1 ? (
                    <span className={`${styles.dialogCardStatus} ${styles.taken}`}>
                      Перехвачен
                    </span>
                  ) : dialog.auto_response ? (
                    <span className={`${styles.dialogCardStatus} ${styles.active}`}>
                      Активен
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Средняя часть - информация о канале и ассистенте */}
              <div className={styles.dialogCardMeta}>
                <div className={styles.dialogCardChannel}>
                  <AssistantIcon botType={getChannelType(dialog)} />
                  <span>{getChannelName(dialog)}</span>
                </div>
                <div>
                  {(() => {
                    const bot = bots.find(b => b.assistant_id === dialog.assistant_id);
                    return bot ? bot.assistant_name : 'Неизвестный';
                  })()}
                </div>
              </div>

              {/* Нижняя часть - время и кнопка */}
              <div className={styles.dialogCardTime}>
                {toLocal(dialog.last_message_at)}
              </div>

              <button
                className={styles.dialogCardOpenBtn}
                onClick={(e) => {
                  e.stopPropagation();
                  onDialogOpen(dialog);
                }}
                aria-label={`Открыть диалог с ${getUserDisplayName(dialog)}`}
              >
                Открыть диалог
              </button>
            </div>
          ))}
      </div>
    </>
  );
};

export default DialogTable;