import { useState } from 'react';
import { Text, View } from 'react-native';

import type { DiagramInput } from '../calculators/diagrams/diagrams';
import { useTheme } from '../theme';
import BendDiagram from './bendDiagram';
import BigButton from './bigButton';
import Card from './card';

/** 现场先读数字；需要说明时再展开图解，不让图解挤走结果。 */
export default function BendGuide({ input, summary }: { input: DiagramInput; summary?: string }) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={{ gap: theme.spacing.sm }}>
      {summary ? (
        <Text style={{ color: theme.colors.textPrimary, fontSize: theme.fontSize.body, lineHeight: 22 }}>
          {summary}
        </Text>
      ) : null}
      <BigButton
        title={expanded ? 'Hide bend diagram' : 'Show bend diagram'}
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
