import { useState } from 'react';
import { Platform, Text, View } from 'react-native';

import type { DiagramInput } from '../calculators/diagrams/diagrams';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import BendDiagram from './bendDiagram';
import BigButton from './bigButton';
import Card from './card';

/** 现场先读数字；Web 端默认展开图解，Native 端默认折叠不挤走结果。 */
export default function BendGuide({ input, summary }: { input: DiagramInput; summary?: string }) {
  const theme = useTheme();
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(Platform.OS === 'web');

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {summary ? (
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 22 }}>
          {summary}
        </Text>
      ) : null}
      <BigButton
        title={expanded ? t('bendGuide.hideDiagram') : t('bendGuide.showDiagram')}
        variant="secondary"
        expanded={expanded}
        onPress={() => setExpanded((value) => !value)}
      />
      {expanded ? (
        <Card style={{ padding: theme.spacing.sm }}>
          <BendDiagram input={input} />
        </Card>
      ) : null}
    </View>
  );
}
